# Cloud Billing cost controls

Use this guide when changing cost controls for the application or its shared Cloud Billing account. Keep account IDs, budget IDs, raw billing exports and credentials in ignored local evidence, not in public release notes.

## Alerts are separate from enforced limits

A recurring monthly budget can cover all projects and all services by omitting project/service filters. Verify the currency, calendar period, credit treatment, notification recipients and thresholds after saving. An all-account budget also covers future projects charged to that account. Reuse an existing matching budget with its etag instead of creating a duplicate or overwriting concurrent changes.

An alerts-only budget sends notifications. It does not block synthesis or stop charges, and a payment threshold is not a spending limit. Do not report a guaranteed invoice ceiling from either setting. Budget notifications can be delayed relative to usage, and invoice charges such as taxes or adjustments must be considered separately.

As checked on 2026-11-02, native spend-cap budgets are limited to one project and one eligible service. Cloud Text-to-Speech is not among the listed eligible services; an account-wide multi-service budget cannot be converted into a universal spend cap. Even supported spend caps are not instantaneous, and applicable overages are billed.

## Automated responses

A budget notification can trigger a custom response, but this is a separate deployed system with credentials, permissions, delivery/retry behavior, monitoring and recovery requirements. Lowering the trigger leaves a buffer; it does not prove a strict spending ceiling. Do not describe an alert budget as an automatic shutdown without verifying the actual response deployment and behavior.

Removing project billing shuts down services, including free-tier resources, and can cause irreversible resource deletion. Restoring billing may require manual action and does not guarantee service recovery. Assess actual resources and affected projects before choosing that response. Do not use it merely to test a budget. A synthetic event in a non-production harness can test a shutdown handler without disabling real services.

The application uses native Thai speech when Google synthesis fails. Disabling billing or a TTS API can therefore leave the app using native speech, but it can affect other services in the same project. Confirm the scope against the current linked-project inventory; do not assume historical project membership remains current.

## Verification and evidence

- Read back the Billing account currency and current linked projects.
- Read existing budgets, save a redacted/private before snapshot, and update only intended fields with the current etag.
- Read back the result and assert monthly amount/currency, all-project/service scope, credit treatment, notification rules and actual threshold bases.
- Verify enforced limits separately from alerts and state whether any automatic response is actually installed.
- Do not induce real costs or shut down production to trigger a threshold. API readback verifies configuration, not receipt of a future email or cutoff latency.
- Operational budget changes do not require an application version bump or redeploy. Do not rerun unrelated app tests as evidence that a billing ceiling works.

## Official references

- [Budgets and alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Spend-cap eligibility and limitations](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
- [Automatic billing removal and its risks](https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications)
- [Budget API setup and costs](https://docs.cloud.google.com/billing/docs/how-to/budget-api-setup)
