"""Minimal Django settings for testing insight_ui_webgl template tags."""

SECRET_KEY = "test-secret-key-not-for-production"  # noqa: S105
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "insight_ui_webgl",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [],
        },
    },
]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    },
}
