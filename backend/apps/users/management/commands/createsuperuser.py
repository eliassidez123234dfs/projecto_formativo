import getpass
import os
import sys

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from django.db import DEFAULT_DB_ALIAS
from django.utils.text import capfirst


class Command(BaseCommand):
    help = "Create a superuser for the custom Usuario model."
    requires_migrations_checks = True
    stealth_options = ("stdin",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from django.contrib.auth import get_user_model
        self.UserModel = get_user_model()
        self.username_field = self.UserModel._meta.get_field(self.UserModel.USERNAME_FIELD)

    def add_arguments(self, parser):
        parser.add_argument("--usuario", help="Specifies the login for the superuser.")
        parser.add_argument("--correo", help="Specifies the email for the superuser.")
        parser.add_argument("--password", help="Specifies the password for the superuser.")
        parser.add_argument(
            "--noinput", "--no-input",
            action="store_false", dest="interactive",
            help=(
                "Tells Django to NOT prompt the user for input of any kind. "
                "You must use --usuario, --correo and --password with --noinput."
            ),
        )
        parser.add_argument(
            "--database",
            default=DEFAULT_DB_ALIAS,
            help='Specifies the database to use. Default is "default".',
        )

    def handle(self, *args, **options):
        usuario = options["usuario"]
        correo = options["correo"]
        password = options["password"]
        database = options["database"]
        verbose_field_name = self.username_field.verbose_name

        try:
            if options["interactive"]:
                if hasattr(sys.stdin, "isatty") and not sys.stdin.isatty():
                    self.stderr.write(
                        "Superuser creation skipped due to not running in a TTY."
                    )
                    return

                while not usuario:
                    usuario = input(f"{capfirst(verbose_field_name)}: ")
                    if not usuario:
                        self.stderr.write("%s cannot be blank." % capfirst(verbose_field_name))
                        continue
                    try:
                        self.UserModel._default_manager.db_manager(database).get_by_natural_key(usuario)
                    except self.UserModel.DoesNotExist:
                        break
                    else:
                        self.stderr.write("Error: That %s is already taken." % verbose_field_name)
                        usuario = None

                while not correo:
                    correo = input("Correo: ")
                    if not correo:
                        self.stderr.write("Correo cannot be blank.")

                while password is None:
                    password = getpass.getpass()
                    password2 = getpass.getpass("Password (again): ")
                    if password != password2:
                        self.stderr.write("Error: Your passwords didn't match.")
                        password = None
                        continue
                    if password.strip() == "":
                        self.stderr.write("Error: Blank passwords aren't allowed.")
                        password = None
                        continue
                    try:
                        validate_password(password, self.UserModel(usuario=usuario, correo=correo))
                    except exceptions.ValidationError as err:
                        self.stderr.write("\n".join(err.messages))
                        response = input("Bypass password validation and create user anyway? [y/N]: ")
                        if response.lower() != "y":
                            password = None
                            continue
            else:
                # Non-interactive mode.
                if not usuario:
                    usuario = os.environ.get("DJANGO_SUPERUSER_USUARIO")
                if not correo:
                    correo = os.environ.get("DJANGO_SUPERUSER_CORREO")
                if not password:
                    password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
                if not usuario:
                    raise CommandError("You must use --usuario with --noinput.")
                if not correo:
                    raise CommandError("You must use --correo with --noinput.")
                if not password:
                    raise CommandError("You must use --password with --noinput.")

            self.UserModel._default_manager.db_manager(database).create_superuser(
                usuario=usuario, correo=correo, password=password
            )
            self.stdout.write("Superuser created successfully.")
        except KeyboardInterrupt:
            self.stderr.write("\nOperation cancelled.")
            sys.exit(1)
        except exceptions.ValidationError as e:
            raise CommandError("; ".join(e.messages))