# Arobid Database Reuse Assessment for Vietnam Industrial Gateway

## 1. Executive decision

VIG should extend the existing Arobid company and product model instead of creating separate industrial-park and industrial-asset master records.

- An industrial park is an Arobid company/seller represented by `core.public.company_profiles`, with the same UUID reused by `core.public.seller_metadata`.
- An industrial land plot, ready-built factory, warehouse, logistics facility, or build-to-suit offer is an Arobid product represented by `domain.public.products` and linked to the industrial park through `products.seller_id`.
- Asset types and industries should reuse the existing category structure in `domain.public.categories`.
- Images, media, variants, price ranges, attributes, tags, certifications, RFQs, matching results, chat, notifications, audit history, and Expo should reuse their existing Arobid tables.
- New storage should be limited to VIG-specific profile governance: sourced values, public/reference documents, park publication state, and the Find Demand workflow.

This approach keeps the existing Arobid identity, seller, catalog, RFQ, matching, communication, and Expo capabilities intact. No new columns are required in `company_profiles` or `products` for the first VIG implementation.

## 2. Inspection scope and evidence

The assessment uses the local schema export generated from `dev-common-service.arobid.site` on `2026-07-15T13:26:54.103Z`:

- `C:\playground\outputs\dev_common_service_schema_core_domain.json`
- `core.public`: 1,299 column records
- `domain.public`: 1,354 column records

The following data dictionaries were also used to validate the detailed company/product structures and their relationship:

- `C:\playground\outputs\stg_common_service_data_dictionary_20260727\company_profile_data_dictionary.csv`
- `C:\playground\outputs\stg_common_service_data_dictionary_20260727\product_data_dictionary.csv`
- `products.seller_id` is intended to reference `core.public.company_profiles.id`; a previous sampled validation found 500/500 sampled seller IDs matched.

Important limitation: the available dev export contains complete `core.public` and `domain.public` schemas but not a complete `core.masterdata` inventory. Existing metadata confirms at least `core.masterdata.subdivisions` and `core.masterdata.ports`. A live schema-delta check must be run before migration to confirm all current master-data tables, constraints, enum values, and changes since July 15.

## 3. Target entity model

| VIG object | Existing Arobid object | Relationship |
|---|---|---|
| Industrial park | `core.public.company_profiles` + `core.public.seller_metadata` | One company/seller row represents one park profile |
| Park operator/developer | Another `company_profiles` row when legally distinct | Referenced by the VIG park extension; reuse the park company itself when they are the same entity |
| Industrial lot/factory/warehouse | `domain.public.products` | `products.seller_id = industrial_park_company_id` |
| Plot configuration or commercial option | `product_variants` | Multiple areas, configurations, or price bands for one asset listing |
| Park/asset industry | `domain.public.categories`, `company_profile_industries`, `product_application_industries` | Reuse taxonomy IDs rather than storing duplicate text |
| Public media | `product_images`, `product_media`, and `seller_metadata.seller_gallery_items` | Reuse current ordering, primary-image, type, and alt-text behavior |
| Find Supply request | `domain.public.rfqs` | Buyer/investor requirement is semantically an RFQ |
| Find Demand request | New VIG connection request linked to a product | The requester is a supplier/park, so it must not be forced into buyer RFQ semantics |
| Matching | `rfq_matched_suppliers` and `ai_bfm_result` | Reuse score, reason details, payload, and progress fields |
| Chat/connection | `conversations`, `conversation_participants`, `messages` | Stop at Trigger/Notify for meeting execution |
| Expo | `expos`, `expo_exhibitors`, `expo_booths`, and related Expo tables | VIG Expo is a branded configuration of the current Expo model |
| Activity timeline | `core.public.audit_entries` or `domain.public.audit_entries` | Reuse actor, action, old/new value, resource, result, and timestamp fields |
| Notifications | `core.public.notifications` and notification event/delivery tables | Reuse for admin assignment and next-step notifications |

## 4. Industrial park field reuse

### 4.1 Direct company-profile reuse

| VIG meaning | Reusable Arobid field | Treatment |
|---|---|---|
| Park ID | `company_profiles.id` | Direct reuse; becomes the canonical park ID |
| Vietnamese name | `local_name` | Direct reuse |
| English name | `english_name` | Direct reuse |
| Display name | `display_name` or `business_name` | Direct reuse |
| URL slug | `slug` | Direct reuse |
| Logo | `logo_url`, with `logo` as legacy fallback | Direct reuse |
| Profile overview | `description` | Direct reuse |
| Establishment year/date | `established_year`, `date_established` | Direct reuse |
| Website | `website` | Direct reuse |
| Country/province/city/district | `location_country`, `location_state_province`, `location_city`, `location_district` | Direct reuse |
| Full/office/registered address | `location_full_address`, `location_office_address`, `location_registered_address` | Direct reuse |
| Public email/phone | `email`, `phone`, `secondary_email` | Direct reuse |
| Contact person/title | `primary_contact_name`, `primary_contact_job_title` | Direct reuse |
| Communication channels | `whatsapp_num`, `wechat_id`, `contact_language`, `social_profiles` | Direct reuse |
| Business registration/legal identity | `company_registration_number`, `business_license_number`, `legal_*` fields | Direct reuse; visibility remains governed separately |
| Ownership/capital summary | `capital_value`, `capital_currency`, `capital_ownership_type` | Direct reuse for summary data |
| Industry | `industry_sector`, `industry_tags`, `company_profile_industries` | Reuse taxonomy references |
| Verification state | `verification_status`, `kyb_status`, `is_kyb`, `verified_at` | Reuse identity/KYB verification; do not treat this as publication status |
| Standard-data review | — | Do not use a percentage. Derive a checklist of available, partial, and missing industrial-park data groups at runtime. |
| Park discriminator | `company_type` and/or `business_type` JSON | Add an `INDUSTRIAL_PARK` value; this is a data value, not a new column |

### 4.2 Direct seller-metadata reuse

| VIG meaning | Reusable Arobid field | Treatment |
|---|---|---|
| Latitude/longitude | `seller_latitude`, `seller_longitude` | Direct reuse |
| Operator overview/highlights | `seller_custom_description`, `seller_company_highlights`, `vision`, `mission`, `core_values` | Direct reuse |
| Operator portfolio/experience | `seller_industry_experience_years`, `seller_key_clients`, `seller_supply_chain_partner_count` | Reuse when the source meaning agrees |
| Certifications | `seller_certifications` | Direct JSON reuse |
| Gallery | `seller_gallery_items`, `seller_banner_image_url` | Direct reuse |
| Nearest port | `seller_nearest_port` | Reuse as a summary; detailed distance/time remains VIG sourced data |
| Warehouse locations/area | `seller_warehouse_locations`, `seller_warehouse_area` | Direct reuse where applicable |
| Sustainability/compliance | `seller_environmental_compliance`, `seller_carbon_neutral`, `seller_labor_compliance` | Direct reuse |
| Logistics capability | `seller_accepted_shipping_methods`, `seller_logistics_partnerships`, `seller_supports_container_load`, `seller_supports_lcl_shipment`, `seller_door_to_door_capable` | Direct reuse |
| Export/shipping reach | `seller_export_markets`, `seller_to_asia`, `seller_to_europe`, `seller_to_north_america` | Direct reuse for operator capability |
| Service capabilities | `seller_service_capabilities`, `service_badges`, `seller_after_sales_service` | Reuse for investor-support services where meanings agree |

Fields must not be reused merely because their type is convenient. For example, `seller_factory_area_value` means the seller's factory area and must not be relabeled as the industrial park's total approved area.

## 5. Industrial asset field reuse

Each industrial lot, ready-built factory, warehouse, logistics facility, or build-to-suit offer should be a product.

| VIG meaning | Reusable Arobid field/table | Treatment |
|---|---|---|
| Asset ID | `products.id` | Direct reuse |
| Owning park | `products.seller_id` | References the industrial park's `company_profiles.id` |
| Asset name/slug/description | `name`, `slug`, `description` | Direct reuse |
| Asset type | `category_id`, `category_ids` | Use industrial-real-estate category nodes |
| Publication state | `status`, `visibility`, `deleted_at` | Reuse current catalog lifecycle |
| General availability | `availabilityStatus` | Reuse for broad availability; detailed available/reserved/occupied states remain in specifications |
| Main image/gallery | `image`, `product_images`, `product_media` | Direct reuse |
| Industry compatibility | `product_application_industries` | Direct reuse |
| Search tags | `product_tags` | Direct reuse |
| Technical characteristics | `specifications` JSONB, `product_attributes`, `product_attribute_values` | Reuse without adding product columns |
| Commercial configurations | `product_variants` | Use for different areas/configurations within one listing |
| Price range | `product_variants.price_min`, `price_max`, `is_contact_price` | Direct reuse |
| Tiered price | `product_price_tiers` | Reuse when pricing changes by area or term |
| Currency/display text | `currency`, `display_price_text`, `publish_price` | Direct reuse |
| Documents/certificates | `product_certifications` | Reuse for asset-level approved files |
| Source/verification | `source`, `source_lang`, `is_verified`, `confidence_score` | Direct reuse at record level |

Store the following VIG-specific values in `products.specifications` during the first implementation instead of adding columns:

- `transaction_mode`: `LEASE`, `TRANSFER`, `SALE`, or `BUILD_TO_SUIT`
- `area_value`, `area_unit`, `minimum_divisible_area`
- `availability_date`
- `price_basis`: per m²/month, per m²/lease term, total transfer price, or contact
- floor loading, clear height, power capacity, fire-protection standard, loading bay count, office ratio, and environmental conditions

Do not use `moq`, `mov`, or packaging fields for area, rental term, or property price. Their current commerce meanings are different.

## 6. Master-data reuse

Use existing master data before creating any VIG lookup table:

- Reuse `domain.public.categories` for the industrial asset and industry hierarchy. Add category rows such as `INDUSTRIAL_LAND`, `READY_BUILT_FACTORY`, `WAREHOUSE`, `LOGISTICS_FACILITY`, and `BUILD_TO_SUIT`; do not add category columns.
- Reuse `company_profile_industries` and `product_application_industries` for park and asset industry relationships.
- Reuse `core.masterdata.subdivisions` for provinces and administrative areas.
- Reuse `core.masterdata.ports` for port references.
- Reuse the country UUID referenced by `company_profiles.location_country` and `seller_metadata.seller_factory_country`; confirm the current country master table during the live delta check.
- Reuse the existing unit-of-measure master if present. Add data rows for `ha`, `m²`, `m`, `MVA`, `MW`, and `m³/day` rather than creating VIG-specific unit fields.

The VIG implementation must not create duplicate country, province, port, industry, category, currency, language, status-label, or unit tables.

## 7. Minimum new storage

### 7.1 `domain.public.industrial_park_profiles`

One extension row per industrial-park company. Proposed minimum columns:

| Column | Purpose |
|---|---|
| `company_id uuid primary key` | References `core.public.company_profiles.id` |
| `operator_company_id uuid null` | References another company profile when the operator is legally distinct |
| `development_status varchar` | Planned, developing, operational, expansion, or closed |
| `park_type varchar` | Industrial park, eco-industrial park, economic-zone park, logistics park, etc. |
| `publication_status varchar` | Draft, in review, published, archived |
| `profile_sections jsonb` | Provincial context, workforce narrative, amenities, phases, masterplan zones, tenants, sustainability, and investment process |
| `data_owner_id uuid null` | Responsible Arobid/VIG user |
| `last_verified_at timestamptz null` | Dataset verification date |
| `verified_by uuid null` | User who verified the profile dataset |

Do not reuse `company_profiles.eprofile_completion_percent` for VIG. The industrial-park module uses a non-scored checklist that compares each profile against the standard data groups; the result is derived at runtime and is not stored as a percentage field.

### 7.2 `domain.public.industrial_sourced_values`

A generic evidence layer for both parks and assets. Proposed columns:

`id`, `entity_type`, `entity_id`, `section_key`, `field_key`, `value_jsonb`, `unit_code`, `as_of`, `source_document_id`, `verification_status`, `disclosure_status`, `is_calculated`, and `conflict_group_id`.

This table is necessary because the current company/product structures do not support per-field sources, effective dates, explicit missing-data states, calculated-value lineage, or unresolved conflicting values.

### 7.3 `domain.public.industrial_documents`

Use `company_kyb_requests.documents` for restricted company/KYB evidence and `product_certifications` for asset-level files. Add this table only for park-level public/reference material that does not fit those meanings.

Proposed columns: `id`, `entity_type`, `entity_id`, `category`, `language`, `issuer`, `document_number`, `issue_date`, `version`, `file_url`, `source_url`, `visibility`, and `verification_status`.

### 7.4 `domain.public.industrial_connection_requests`

- Find Supply should create an RFQ and store its ID in `rfq_id`.
- Find Demand should reference the offered product in `product_id`.
- Both flows can share the same VIG operational status and admin queue.

Proposed columns: `id`, `kind`, `requester_company_id`, `rfq_id`, `product_id`, `service_type`, `status`, `contact_snapshot jsonb`, `requirements jsonb`, `rejection_reason`, `submitted_at`, and `updated_at`.

Do not create a separate activity table. Record every status change in the existing `audit_entries` table using `resource_type = 'INDUSTRIAL_CONNECTION_REQUEST'`.

## 8. Existing workflows that should be reused

| VIG capability | Existing Arobid capability |
|---|---|
| Find Supply | `rfqs`, `rfq_invited_suppliers`, `rfq_matched_suppliers`, `rfq_quotations` |
| Explainable recommendations | `rfq_matched_suppliers.match_score` and `match_reason_details`; `ai_bfm_result` for result payloads and progress |
| Chat | `conversations`, `conversation_participants`, `messages`, `message_attachments` |
| Notification | `notifications`, `notification_events`, `notification_deliveries`, `notification_inbox` |
| Admin history | `audit_entries` with old/new JSON values and actor metadata |
| Draft profile editing | `company_profile_drafts.data` JSONB, followed by publishing into company/seller plus the VIG extension |
| Verification | Existing company KYB fields and `company_kyb_requests`; separate identity verification from dataset publication |
| Industrial Expo | Existing `expos`, halls, booths, exhibitors, templates, sponsors, and asset fields |

## 9. Semantic safeguards

1. `verification_status` is not the same as `publication_status`. A company may be legally verified while its park dataset is still a draft.
2. `products.availabilityStatus` is not sufficient for land planning. Available, reserved, occupied, utility, and future-development zones must remain explicit VIG values.
3. `seller_factory_area_value` is not industrial park total area.
4. Product MOQ/MOV and packaging dimensions must not represent land area, lease duration, or property price.
5. `seller_key_clients` can provide a display summary, but structured existing-tenant records with display permission and origin/sector should remain in `profile_sections` until a dedicated relationship table is justified.
6. KYB documents are restricted evidence; public brochures, masterplans, and government decisions require their own visibility rules.
7. Missing values remain `not_disclosed` or `not_available`; they must never be written as zero.

## 10. Recommended implementation sequence

1. Run a live read-only schema delta against `dev-common-service.arobid.site`, including `core.masterdata`, PostgreSQL enums, foreign keys, and indexes.
2. Add industrial-real-estate category and unit rows to existing master data.
3. Register each industrial park as `company_profiles` + `seller_metadata` with `company_type = 'INDUSTRIAL_PARK'`.
4. Create the four minimal VIG extension tables without modifying existing company/product columns.
5. Publish lots, factories, warehouses, and build-to-suit offers as products linked by `seller_id`.
6. Use RFQ for Find Supply, the VIG connection request for Find Demand, and existing audit/notification/chat infrastructure for operational handling.
7. Build compatibility views that return the VIG profile shape by joining company, seller metadata, products, categories, and the VIG extension tables.
8. Add indexes only for demonstrated query paths: park status/publication, province, sourced field key, document visibility, request status, `products.seller_id`, categories, and JSONB specifications.

## 11. Final recommendation

Proceed with the reuse model.

The correct Arobid mapping is:

```text
Industrial Park = Company Profile + Seller Metadata + small VIG extension
Industrial Lot / Factory / Warehouse = Product owned by the park seller
Find Supply = RFQ
Find Demand = Product-linked VIG connection request
Matching / Chat / Notification / Audit / Expo = existing Arobid modules
```

This preserves the meanings of existing fields, avoids duplicate company/product/master data, and confines new development to industrial-property information that Arobid does not currently model.

## 12. Exhaustive attribute-level mapping

The companion workbook `Arobid_VIG_Exhaustive_Attribute_Mapping.xlsx` expands this architectural report into a field-by-field implementation audit:

- 761 current attributes mapped across 34 VIG-relevant tables.
- 328 company/industrial-park attributes, 172 product/industrial-asset attributes, and 261 workflow attributes.
- Every selected source column has a reuse decision, VIG target object, mapped meaning, transformation/business rule, gap note, confidence, and implementation phase.
- Reuse decisions distinguish direct, platform, restricted, conditional, not-required, and semantically invalid reuse.
- The Coverage sheet verifies 100% column coverage and zero blank reuse decisions for every selected table.
- The New Extension Fields sheet proposes 47 fields only where the current Arobid meaning is insufficient.

“Exhaustive” here means every current column in the selected VIG-relevant tables from the schema snapshot generated on 2026-07-15. It does not claim that unrelated Arobid modules were mapped. The available snapshot contains complete `core.public` and `domain.public` table definitions but not the complete `core.masterdata` schema. Confirmed partial master-data attributes and all remaining live checks are therefore listed separately in the workbook's `Masterdata_Gaps` sheet.
