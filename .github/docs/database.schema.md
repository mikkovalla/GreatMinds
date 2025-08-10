# Database Schema Documentation

> **Warning:**  
> This schema is provided for **context only** and is **not meant to be executed** directly.  
> The table order and constraints may not be valid for direct execution.

---

## Table: `public.entitlements`

Stores information about user entitlements (e.g., feature access, plan benefits).

| Column       | Type                           | Constraints / Default                                     | Description |
|--------------|--------------------------------|-----------------------------------------------------------|-------------|
| `id`         | `bigint`                       | **PK**; default `nextval('entitlements_id_seq')`          | Unique entitlement identifier. |
| `user_id`    | `uuid`                         | **FK** → `public.profiles.id`; **NOT NULL**                | The user this entitlement belongs to. |
| `key`        | `text`                         | **NOT NULL**                                               | The entitlement key (identifier). |
| `value`      | `jsonb`                        |                                                           | Arbitrary JSON value for entitlement metadata. |
| `starts_at`  | `timestamp with time zone`     | Default `now()`                                            | When the entitlement becomes active. |
| `ends_at`    | `timestamp with time zone`     |                                                           | When the entitlement expires (optional). |
| `created_at` | `timestamp with time zone`     | **NOT NULL**, default `now()`                              | Timestamp of creation. |

---

## Table: `public.profiles`

Stores user profile data linked to authentication.

| Column              | Type                           | Constraints / Default                                     | Description |
|---------------------|--------------------------------|-----------------------------------------------------------|-------------|
| `id`                | `uuid`                         | **PK**; **FK** → `auth.users.id`; **NOT NULL**             | Unique profile identifier (matches auth user ID). |
| `email`             | `text`                         |                                                           | User's email address. |
| `stripe_customer_id`| `text`                         | `UNIQUE`                                                  | Corresponding Stripe Customer ID. |
| `created_at`        | `timestamp with time zone`     | **NOT NULL**, default `now()`                              | Timestamp of profile creation. |
| `updated_at`        | `timestamp with time zone`     | **NOT NULL**, default `now()`                              | Timestamp of last update. |

---

## Table: `public.subscription_status`

Stores subscription status for each user.

| Column               | Type                           | Constraints / Default                                                     | Description |
|----------------------|--------------------------------|---------------------------------------------------------------------------|-------------|
| `user_id`            | `uuid`                         | **PK**; **FK** → `public.profiles.id`; **NOT NULL**                        | The user this subscription belongs to. |
| `stripe_customer_id` | `text`                         | **NOT NULL**                                                               | Associated Stripe Customer ID. |
| `status`             | `USER-DEFINED` (`subscription_status_t`) | **NOT NULL**, default `'none'`                                            | Subscription status (e.g., active, canceled). |
| `price_id`           | `text`                         |                                                                           | Stripe Price ID for the subscription. |
| `product_id`         | `text`                         |                                                                           | Stripe Product ID for the subscription. |
| `current_period_end` | `timestamp with time zone`     |                                                                           | End time of the current billing period. |
| `cancel_at`          | `timestamp with time zone`     |                                                                           | Scheduled cancellation date (if any). |
| `canceled_at`        | `timestamp with time zone`     |                                                                           | Actual cancellation date. |
| `trial_end`          | `timestamp with time zone`     |                                                                           | End date of trial period (if applicable). |
| `updated_at`         | `timestamp with time zone`     | **NOT NULL**, default `now()`                                              | Timestamp of last update. |

---

## Table: `public.webhook_events`

Stores received webhook events from external providers.

| Column        | Type                           | Constraints / Default                                     | Description |
|---------------|--------------------------------|-----------------------------------------------------------|-------------|
| `id`          | `bigint`                       | **PK**; default `nextval('webhook_events_id_seq')`         | Unique webhook event ID. |
| `provider`    | `text`                         | **NOT NULL**                                               | Provider sending the webhook (e.g., Stripe). |
| `event_id`    | `text`                         | **UNIQUE**, **NOT NULL**                                   | Unique event identifier from the provider. |
| `event_type`  | `text`                         | **NOT NULL**                                               | Type of event (e.g., `invoice.payment_succeeded`). |
| `user_id`     | `uuid`                         |                                                           | User related to this event, if applicable. |
| `received_at` | `timestamp with time zone`     | **NOT NULL**, default `now()`                              | When the event was received. |
| `processed_at`| `timestamp with time zone`     |                                                           | When the event was processed. |
| `success`     | `boolean`                      | Default `true`                                             | Whether the processing was successful. |
| `payload`     | `jsonb`                        |                                                           | Raw event payload. |

---
