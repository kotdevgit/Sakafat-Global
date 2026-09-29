"""Durable private media storage for the Vercel deployment."""

import os
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.core.files.storage import Storage

from vercel.blob import BlobClient
from vercel.blob.errors import BlobNotFoundError


class VercelBlobStorage(Storage):
    @property
    def _token(self):
        return os.environ["BLOB_READ_WRITE_TOKEN"]

    def _open(self, name, mode="rb"):
        if mode != "rb":
            raise ValueError("Blob files can only be opened for reading")
        with BlobClient() as client:
            result = client.get(name, access="private", token=self._token)
        if result is None:
            raise FileNotFoundError(name)
        return ContentFile(result.content, name=name)

    def _save(self, name, content):
        with BlobClient() as client:
            result = client.put(name, content.read(), access="private", token=self._token)
        return result.pathname

    def exists(self, name):
        try:
            with BlobClient() as client:
                client.head(name, token=self._token)
            return True
        except BlobNotFoundError:
            return False

    def delete(self, name):
        if name:
            with BlobClient() as client:
                client.delete(name, token=self._token)

    def size(self, name):
        with BlobClient() as client:
            return client.head(name, token=self._token).size

    def url(self, name):
        return "/media/" + quote(name, safe="/")
