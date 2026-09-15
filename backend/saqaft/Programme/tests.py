from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Programme


class ProgrammeApiTests(TestCase):
    url = "/api/programme/"

    def setUp(self):
        # The seed migration populates the test database; these cases define their own data.
        Programme.objects.all().delete()
        self.published = Programme.objects.create(
            name="Sakafat Signals 01.0", slug="signals", pillar="ikhlakiat",
            status="open", description="An open call.", position=0,
        )
        self.draft = Programme.objects.create(
            name="Unannounced", slug="unannounced", pillar="sama",
            status="development", description="Not published yet.",
            position=1, is_active=False,
        )

    def staff_headers(self):
        staff = User.objects.create_user("editor", "editor@example.test", "example-test-password", is_staff=True)
        return {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(staff).access_token}"}

    def test_anyone_can_read_published_programmes(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["slug"] for item in response.json()], ["signals"])

    def test_unpublished_programmes_are_hidden_from_the_public(self):
        self.assertNotIn("unannounced", [item["slug"] for item in self.client.get(self.url).json()])

    def test_staff_see_unpublished_programmes(self):
        response = self.client.get(self.url, **self.staff_headers())

        self.assertEqual(
            sorted(item["slug"] for item in response.json()), ["signals", "unannounced"]
        )

    def test_programmes_are_ordered_by_position(self):
        Programme.objects.create(
            name="First", slug="first", pillar="falah",
            status="open", description="Shown first.", position=0,
        )
        self.published.position = 5
        self.published.save(update_fields=["position"])

        self.assertEqual([item["slug"] for item in self.client.get(self.url).json()], ["first", "signals"])

    def test_response_carries_display_labels_for_pillar_and_status(self):
        entry = self.client.get(self.url).json()[0]

        self.assertEqual(entry["pillar_label"], "Ikhlakiat")
        self.assertEqual(entry["status_label"], "Open")

    def test_can_retrieve_programme_by_slug_and_by_id(self):
        by_slug = self.client.get(f"{self.url}signals/")
        self.assertEqual(by_slug.status_code, 200)
        self.assertEqual(by_slug.json()["slug"], "signals")

        by_id = self.client.get(f"{self.url}{self.published.id}/")
        self.assertEqual(by_id.status_code, 200)
        self.assertEqual(by_id.json()["slug"], "signals")

    def test_anonymous_users_cannot_create_programmes(self):
        response = self.client.post(self.url, {
            "name": "Injected", "slug": "injected", "pillar": "sama",
            "status": "open", "description": "x",
        })

        self.assertIn(response.status_code, (401, 403))
        self.assertFalse(Programme.objects.filter(slug="injected").exists())

    def test_signed_in_non_staff_cannot_change_programmes(self):
        member = User.objects.create_user("member", "member@example.test", "example-test-password")
        headers = {"HTTP_AUTHORIZATION": f"Bearer {RefreshToken.for_user(member).access_token}"}

        response = self.client.delete(f"{self.url}{self.published.id}/", **headers)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Programme.objects.filter(slug="signals").exists())

    def test_staff_can_create_update_and_delete(self):
        headers = self.staff_headers()

        created = self.client.post(self.url, {
            "name": "New Programme", "slug": "new-programme", "pillar": "rabta",
            "status": "upcoming", "description": "A new one.",
        }, **headers)
        self.assertEqual(created.status_code, 201)

        identifier = created.json()["id"]
        updated = self.client.patch(
            f"{self.url}{identifier}/", {"status": "open"},
            content_type="application/json", **headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(Programme.objects.get(pk=identifier).status, "open")

        self.assertEqual(self.client.delete(f"{self.url}{identifier}/", **headers).status_code, 204)
        self.assertFalse(Programme.objects.filter(pk=identifier).exists())

    def test_status_choices_have_no_duplicate_labels(self):
        labels = [label for _, label in Programme.STATUS_CHOICES]

        self.assertEqual(len(labels), len(set(labels)))


class SeededProgrammeTests(TestCase):
    """The migration keeps the previously hardcoded programmes on the public site."""

    def test_seed_publishes_the_original_programmes_in_order(self):
        self.assertEqual(
            list(Programme.objects.values_list("slug", flat=True)),
            ["signals", "lawtency", "confidence", "career", "minds", "sama"],
        )

    def test_seeded_programmes_are_published_with_a_pillar_and_valid_status(self):
        statuses = dict(Programme.STATUS_CHOICES)
        pillars = dict(Programme.PILLAR_CHOICES)

        for programme in Programme.objects.all():
            with self.subTest(programme.slug):
                self.assertTrue(programme.is_active)
                self.assertIn(programme.status, statuses)
                self.assertIn(programme.pillar, pillars)


class ProgrammeAdminTests(TestCase):
    """The admin panel is the CRUD surface for programmes."""

    def setUp(self):
        self.admin = User.objects.create_superuser("curator", "curator@example.test", "example-test-password")
        self.client.force_login(self.admin)

    def test_programme_changelist_is_available(self):
        response = self.client.get("/admin/Programme/programme/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sakafat Signals 01.0")

    def test_staff_can_add_a_programme_through_the_admin(self):
        response = self.client.post("/admin/Programme/programme/add/", {
            "name": "New Programme", "slug": "new-programme", "pillar": "rabta",
            "status": "upcoming", "description": "Added in the admin.",
            "position": "9", "is_active": "on",
        })

        self.assertEqual(response.status_code, 302)
        created = Programme.objects.get(slug="new-programme")
        self.assertEqual(created.pillar, "rabta")

    def test_staff_can_edit_and_delete_through_the_admin(self):
        programme = Programme.objects.get(slug="signals")

        edited = self.client.post(f"/admin/Programme/programme/{programme.pk}/change/", {
            "name": programme.name, "slug": programme.slug, "pillar": programme.pillar,
            "status": "upcoming", "description": programme.description,
            "position": str(programme.position),
        })
        self.assertEqual(edited.status_code, 302)
        programme.refresh_from_db()
        self.assertEqual(programme.status, "upcoming")
        # The unchecked is_active box unpublishes it from the public site.
        self.assertFalse(programme.is_active)

        deleted = self.client.post(f"/admin/Programme/programme/{programme.pk}/delete/", {"post": "yes"})
        self.assertEqual(deleted.status_code, 302)
        self.assertFalse(Programme.objects.filter(slug="signals").exists())
