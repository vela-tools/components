# ngsi-client test fixtures

Responses replayed by the unit tests through a mocked `fetch`. Each file is `{ status, headers, body }`.

All fixtures are synthetic. Ids, names, coordinates, timestamps and counts are made up; type and attribute names come from the public Smart Data Models vocabulary or `example.org`. The shapes follow the NGSI-LD spec and what a Scorpio broker answers:

- `types`, `types-details`, `type-info-virtual-camera-sensor`: `GET /types`, `GET /types?details=true`, `GET /types/{type}`
- `entities-virtual-camera-sensor`, `entities-crowd-flow`, `entity-by-id`: `GET /entities` and `GET /entities/{id}`
- `error-entity-not-found`, `error-bad-q` (Scorpio answers a malformed q with 500), `error-query-without-type-or-q`: problem details
- `subscriptions`: subscriptions with `receiverInfo` objects and `isActive`, plus one without an id
- `notifications`: `ScorpioNotification` entities as stored by the webhook, one with expanded attribute names and one without a `subscriptionId`
