<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

## Set-up kitchen module with NestJs

Please [read more here](https://docs.nestjs.com/) for NestJS documentation

## Step 1: Install Node version v20

## Step 2: Download extension for prettier and eslint

## Step 3 : Node modules installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Create controller service and module with CLI

```bash
# development
$ nest generate resource resource_name

Example: nest generate resource Recipies

```

## Check swagger API documentation

```bash
# swagger
http://localhost:YOUR_PORT/api/docs

```

## Vendor recipe bulk-upload (userkms → be-meal-vendors)

KMS users upload recipe CSV via the kitchen module; recipes are created under vendor `kms@delicut.io` in be-meal-vendors.

| Variable | Default | Description |
|----------|---------|-------------|
| `VENDOR_SERVICE_HTTP_URL` | `http://localhost:3008` | be-meal-vendors base URL (direct or via gateway) |
| `KITCHEN_VENDOR_API_KEY` | — | Same value as `KITCHEN_VENDOR_API_KEY` in be-meal-vendors |

**Auth (staging):** nginx on `staging-rms-api.delicut.ae` blocks `Authorization` (and `x-rms-authorization`) before Nest — you get `Please sign in to continue`. Use:

```http
access-token: Bearer <userkms_access_token>
```

Do **not** send `Authorization` on staging. Local dev accepts `Authorization` or `access-token`.

**Endpoints (require userkms token):**

- `POST /api/vendor-kitchen/recipes/bulk-upload` — multipart field `file`
- `GET /api/vendor-kitchen/recipes/bulk-upload/template`
- `GET /api/vendor-kitchen/recipes/bulk-upload/template/json`

Vendor portal continues to use `POST /api/v1/vendor/recipes/bulk-upload` with a vendor JWT.
