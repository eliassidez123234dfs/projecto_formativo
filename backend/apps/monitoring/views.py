import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger('client_errors')


class ClientErrorThrottle(SimpleRateThrottle):
    scope = 'client_errors'

    def get_cache_key(self, request, view):
        ident = getattr(request, 'META', {}).get('REMOTE_ADDR', 'unknown')
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class ClientErrorLogView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ClientErrorThrottle]

    def post(self, request):
        data = request.data or {}
        errors = data.get('errors') or []
        if not isinstance(errors, list):
            errors = [errors]

        written = 0
        for err in errors[:50]:
            if not isinstance(err, dict):
                continue
            entry = {
                'type': str(err.get('type') or 'Error')[:60],
                'message': str(err.get('message') or '')[:300],
                'status': err.get('status'),
                'url': str(err.get('url') or '')[:200],
                'timestamp': str(err.get('timestamp') or '')[:32],
            }
            logger.warning(
                'CLIENT ERROR | type=%s status=%s url=%s msg=%s',
                entry['type'], entry['status'], entry['url'], entry['message']
            )
            written += 1
        return Response({'logged': written}, status=status.HTTP_200_OK)
