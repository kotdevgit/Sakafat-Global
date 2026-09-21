import io

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from PIL import Image as PILImage


def make_image(width, height):
    """A real image file, so Django can read its dimensions on save."""
    buffer = io.BytesIO()
    PILImage.new("RGB", (width, height), (120, 35, 42)).save(buffer, format="PNG")
    return ContentFile(buffer.getvalue())

from django.db.models import ProtectedError
from django.test import TestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Episode, EpisodeCategory


class EpisodeApiTests(TestCase):
    url = "/api/episode/"

    def setUp(self):
        # The seed migration populates the test database; these cases define their own data.
        Episode.objects.all().delete()
        self.documentary = EpisodeCategory.objects.get(slug="documentary")
        self.dialogue = EpisodeCategory.objects.get(slug="dialogue")
        self.published = Episode.objects.create(
            title="A Culture in Motion", slug="culture-in-motion", category=self.documentary,
            description="People and places.", position=0,
        )
        self.draft = Episode.objects.create(
            title="Unannounced", slug="unannounced", category=self.dialogue,
            description="Not published yet.", position=1, is_active=False,
        )

    def staff_headers(self):
        staff = User.objects.create_user("editor", "editor@example.test", "example-test-password", is_staff=True)
        return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(staff).access_token}"}

    def test_anyone_can_read_published_episodes(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["slug"] for item in response.json()], ["culture-in-motion"])

    def test_unpublished_episodes_are_hidden_from_the_public(self):
        self.assertNotIn("unannounced", [item["slug"] for item in self.client.get(self.url).json()])

    def test_staff_see_unpublished_episodes(self):
        response = self.client.get(self.url, **self.staff_headers())

        self.assertEqual(
            sorted(item["slug"] for item in response.json()), ["culture-in-motion", "unannounced"]
        )

    def test_episodes_are_ordered_by_position(self):
        Episode.objects.create(
            title="First", slug="first", category=EpisodeCategory.objects.get(slug="performance"),
            description="Shown first.", position=0,
        )
        self.published.position = 5
        self.published.save(update_fields=["position"])

        self.assertEqual([item["slug"] for item in self.client.get(self.url).json()], ["first", "culture-in-motion"])

    def test_response_carries_the_category_slug_and_display_label(self):
        entry = self.client.get(self.url).json()[0]

        self.assertEqual(entry["category"], "documentary")
        self.assertEqual(entry["category_label"], "Documentary")

    def test_renaming_a_category_does_not_change_the_public_slug(self):
        self.documentary.name = "Long Form Documentary"
        self.documentary.save(update_fields=["name"])

        entry = self.client.get(self.url).json()[0]

        self.assertEqual(entry["category"], "documentary")
        self.assertEqual(entry["category_label"], "Long Form Documentary")

    def test_episode_can_be_read_by_slug(self):
        response = self.client.get(f"{self.url}culture-in-motion/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "A Culture in Motion")

    def test_unpublished_episode_is_not_readable_by_slug(self):
        self.assertEqual(self.client.get(f"{self.url}unannounced/").status_code, 404)

    def test_anonymous_users_cannot_create_episodes(self):
        response = self.client.post(self.url, {
            "title": "Injected", "slug": "injected", "category": "dialogue", "description": "x",
        })

        self.assertIn(response.status_code, (401, 403))
        self.assertFalse(Episode.objects.filter(slug="injected").exists())

    def test_signed_in_non_staff_cannot_change_episodes(self):
        member = User.objects.create_user("member", "member@example.test", "example-test-password")
        headers = {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(member).access_token}"}

        response = self.client.delete(f"{self.url}{self.published.id}/", **headers)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Episode.objects.filter(slug="culture-in-motion").exists())

    def test_staff_can_create_update_and_delete(self):
        headers = self.staff_headers()

        created = self.client.post(self.url, {
            "title": "New Episode", "slug": "new-episode", "category": "performance",
            "description": "A new one.",
        }, **headers)
        self.assertEqual(created.status_code, 201)

        identifier = created.json()["id"]
        updated = self.client.patch(
            f"{self.url}{identifier}/", {"category": "dialogue"},
            content_type="application/json", **headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(Episode.objects.get(pk=identifier).category.slug, "dialogue")

        self.assertEqual(self.client.delete(f"{self.url}{identifier}/", **headers).status_code, 204)
        self.assertFalse(Episode.objects.filter(pk=identifier).exists())


class SeededEpisodeTests(TestCase):
    """The migration keeps the previously hardcoded episodes on the homepage."""

    def test_seed_publishes_the_original_episodes_in_order(self):
        self.assertEqual(
            list(Episode.objects.values_list("slug", flat=True)),
            ["living-heritage", "culture-in-motion", "conversations-that-matter"],
        )

    def test_seeded_episodes_keep_their_images_and_alt_text(self):
        for episode in Episode.objects.all():
            with self.subTest(episode.slug):
                self.assertTrue(episode.is_active)
                self.assertTrue(episode.image.name, "seed should carry the artwork across")
                self.assertTrue(episode.image_alt)


class EpisodeAdminTests(TestCase):
    """The admin panel is the CRUD surface for episodes."""

    def setUp(self):
        self.admin = User.objects.create_superuser("curator", "curator@example.test", "example-test-password")
        self.client.force_login(self.admin)

    def test_episode_changelist_is_available(self):
        response = self.client.get("/admin/Episode/episode/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "A Culture in Motion")

    def test_staff_can_add_an_episode_through_the_admin(self):
        response = self.client.post("/admin/Episode/episode/add/", {
            "title": "New Episode", "slug": "new-episode",
            "category": str(EpisodeCategory.objects.get(slug="dialogue").pk),
            "description": "Added in the admin.", "image_alt": "", "video_url": "",
            "position": "9", "is_active": "on",
        })

        self.assertEqual(response.status_code, 302)
        self.assertEqual(Episode.objects.get(slug="new-episode").category.slug, "dialogue")

    def test_staff_can_edit_and_delete_through_the_admin(self):
        episode = Episode.objects.get(slug="culture-in-motion")

        edited = self.client.post(f"/admin/Episode/episode/{episode.pk}/change/", {
            "title": episode.title, "slug": episode.slug,
            "category": str(EpisodeCategory.objects.get(slug="performance").pk),
            "description": episode.description, "image_alt": episode.image_alt,
            "video_url": "", "position": str(episode.position),
        })
        self.assertEqual(edited.status_code, 302)
        episode.refresh_from_db()
        self.assertEqual(episode.category.slug, "performance")
        # The unchecked is_active box unpublishes it from the homepage.
        self.assertFalse(episode.is_active)

        deleted = self.client.post(f"/admin/Episode/episode/{episode.pk}/delete/", {"post": "yes"})
        self.assertEqual(deleted.status_code, 302)
        self.assertFalse(Episode.objects.filter(slug="culture-in-motion").exists())


class EpisodeCategoryTests(TestCase):
    """Categories are data, so editors add them without a migration or deploy."""

    def setUp(self):
        self.admin = User.objects.create_superuser("curator", "curator@example.test", "example-test-password")
        self.client.force_login(self.admin)

    def test_staff_can_add_a_category_in_the_admin_and_use_it(self):
        added = self.client.post("/admin/Episode/episodecategory/add/", {
            "name": "Interview", "slug": "interview", "position": "3",
        })
        self.assertEqual(added.status_code, 302)

        category = EpisodeCategory.objects.get(slug="interview")
        episode = self.client.post("/admin/Episode/episode/add/", {
            "title": "A New Interview", "slug": "a-new-interview", "category": str(category.pk),
            "description": "Uses a brand new category.", "image_alt": "", "video_url": "",
            "position": "9", "is_active": "on",
        })

        self.assertEqual(episode.status_code, 302)
        self.client.logout()
        entry = [item for item in self.client.get("/api/episode/").json() if item["slug"] == "a-new-interview"][0]
        self.assertEqual(entry["category"], "interview")
        self.assertEqual(entry["category_label"], "Interview")

    def test_a_category_still_in_use_cannot_be_deleted(self):
        category = EpisodeCategory.objects.get(slug="documentary")
        self.assertTrue(category.episodes.exists())

        with self.assertRaises(ProtectedError):
            category.delete()

        self.assertTrue(EpisodeCategory.objects.filter(slug="documentary").exists())

    def test_an_unused_category_can_be_deleted(self):
        category = EpisodeCategory.objects.create(name="Unused", slug="unused")

        category.delete()

        self.assertFalse(EpisodeCategory.objects.filter(slug="unused").exists())

    def test_position_orders_categories_ahead_of_their_name(self):
        Episode.objects.all().delete()
        EpisodeCategory.objects.all().delete()
        EpisodeCategory.objects.create(name="Aaa Last", slug="aaa-last", position=5)
        EpisodeCategory.objects.create(name="Zzz First", slug="zzz-first", position=1)

        self.assertEqual(
            list(EpisodeCategory.objects.values_list("slug", flat=True)), ["zzz-first", "aaa-last"]
        )


class HeroPortraitTests(TestCase):
    """The hero prefers a purpose-made upright image over cropping the card one."""

    def setUp(self):
        Episode.objects.all().delete()
        self.episode = Episode.objects.create(
            title="A Culture in Motion", slug="culture-in-motion",
            category=EpisodeCategory.objects.get(slug="documentary"),
            description="People and places.", position=0,
        )

    def entry(self):
        return self.client.get("/api/episode/").json()[0]

    def test_portrait_image_is_optional(self):
        self.assertIsNone(self.entry()["hero_image"])

    def test_portrait_image_is_exposed_with_its_dimensions(self):
        self.episode.hero_image.save("upright.png", make_image(900, 1100), save=True)

        entry = self.entry()

        self.assertIn("episodes/hero/", entry["hero_image"])
        self.assertEqual(entry["hero_image_width"], 900)
        self.assertEqual(entry["hero_image_height"], 1100)

    def test_portrait_image_is_stored_separately_from_the_card_image(self):
        self.episode.image.save("card.png", make_image(400, 222), save=True)
        self.episode.hero_image.save("upright.png", make_image(900, 1100), save=True)
        self.episode.refresh_from_db()

        self.assertIn("episodes/card", self.episode.image.name)
        self.assertIn("episodes/hero/upright", self.episode.hero_image.name)
        self.assertEqual((self.episode.image_width, self.episode.image_height), (400, 222))
        self.assertEqual((self.episode.hero_image_width, self.episode.hero_image_height), (900, 1100))


class UnfoldAdminTests(TestCase):
    """Every registered admin page must render through Unfold's templates."""

    CHANGELISTS = (
        "admin:Programme_programme_changelist",
        "admin:Episode_episode_changelist",
        "admin:Episode_episodecategory_changelist",
        "admin:Contact_contact_changelist",
        "admin:auth_user_changelist",
        "admin:auth_group_changelist",
        "admin:User_otpverification_changelist",
        "admin:User_passwordresetotp_changelist",
    )

    def setUp(self):
        self.admin = User.objects.create_superuser("curator", "curator@example.test", "example-test-password")
        self.client.force_login(self.admin)

    def used_unfold(self, response):
        return any(template.name and template.name.startswith("unfold/") for template in response.templates)

    def test_dashboard_renders_with_site_branding(self):
        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.used_unfold(response))
        self.assertContains(response, "Sakafat Global")

    def test_every_changelist_renders(self):
        for name in self.CHANGELISTS:
            with self.subTest(view=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, 200)
                self.assertTrue(self.used_unfold(response), f"{name} fell back to the stock admin")

    def test_add_forms_render(self):
        # The auth forms are the ones Unfold has to swap out, so check one of each.
        for name in ("admin:Episode_episode_add", "admin:auth_user_add"):
            with self.subTest(view=name):
                self.assertEqual(self.client.get(reverse(name)).status_code, 200)
