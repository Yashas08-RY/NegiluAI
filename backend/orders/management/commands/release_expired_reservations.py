from django.core.management.base import BaseCommand

from orders.services import release_expired_stock_reservations


class Command(BaseCommand):
    help = "Release stock held by expired, unpaid order reservations."

    def handle(self, *args, **options):
        released = release_expired_stock_reservations()
        self.stdout.write(self.style.SUCCESS(f"Released {released} expired reservation(s)."))
