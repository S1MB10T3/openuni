# api and ORM for OpenUNI

## Requirements
* Python 3.5 or higher

## Setup and customize

1. ` touch .env` To create a environement file with the following values filled

```
DEBUG=true
SECRET_KEY=[secret-key]
DJANGO_SETTINGS_MODULE=django_config.settings.local
ALLOWED_HOSTS=localhost,127.0.0.1, 0.0.0.0
DATABASE_URL=postgres://dev:tester321@localhost:5432/openuni

MAILGUN_API_KEY=[mailgun-api-key]
MAILGUN_DEFAULT_FROM_EMAIL=[email]

POSTGRES_PASSWORD=tester321
POSTGRES_USER=dev
POSTGRES_DB=openuni

EMAIL_USE_TLS=True
EMAIL_PORT=587
EMAIL_HOST=smtp.domain.com
EMAIL_HOST_USER=email@cozy.nyc
EMAIL_HOST_PASSWORD=password
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DEFAULT_FROM_EMAIL=default@cozy.nyc

```
2. In the requirements folder run
```
pip install -r local.txt
```
3. Run basic django commands such as
```
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```
