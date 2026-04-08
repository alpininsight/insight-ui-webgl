"""Minimal Django settings: insight-ui-webgl with insight-ui base template."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

SECRET_KEY = "example-secret-key-not-for-production"  # noqa: S105
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "insight_ui",
    "insight_ui_webgl",
]

MIDDLEWARE = [
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.template.context_processors.i18n",
                "insight_ui.config.get_context",
            ],
        },
    },
]

DATABASES: dict = {}

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_USE_FINDERS = True

# insight-ui: skip tailwind_cli.html include (workaround for issue #117)
PROJECT_NAME = "insight-ui-webgl"
