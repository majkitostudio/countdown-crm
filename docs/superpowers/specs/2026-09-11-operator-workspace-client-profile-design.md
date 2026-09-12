# Operator Workspace, Client Profile, And Verified Delivery Address

## Purpose

Make the Operator Console a focused call workspace while moving long-lived customer context into an explicitly opened Client Profile. Operators must be able to read the current customer's history and add a shared note, but they must not edit customer records. A delivered order should provide the latest verified delivery address without inventing historical data.

## Decisions

- The current `/leads/[leadId]` route becomes the **Client Profile**. There is no duplicate profile model or route.
- Clicking the assigned customer's name, or its adjacent profile action, opens the Client Profile in a new browser tab with `target="_blank"` and `rel="noopener noreferrer"`.
- Operators may open only their current server-assigned customer, using the existing scoped-lead authorization boundary.
- The profile is read-only except for adding shared lead notes. It never exposes edits for a customer's contact fields, company, status, or address.
- The Compact / Extended client-profile density preference and its Workspace control are removed.
- A delivered address comes only from the newest order with a non-null address snapshot and `status = 'delivered'`. It is labelled **Last verified delivery address** with the delivery date. Orders with any other status do not verify an address.
- Existing orders receive no guessed or backfilled address. Until a newly captured address is associated with a delivered order, the profile and Workspace state that the address is not yet verified.

## Workspace Experience

The normal Workspace keeps the approved visual language while prioritising the active call:

- the assigned-customer header with name, phone, email, status, and the profile link;
- a compact recorded call context strip with only the customer's need, routing reason, and safe next step;
- the approved Product Script with discovery questions inside the script surface;
- shared operator notes immediately beside the script in normal mode and directly below it in focus mode;
- callback, recent signals, and Timeline below the note surface.

The assigned-customer header links to the long-lived profile through an icon-only action in a new browser tab with a safe read-only boundary. The duplicate ClientProfileCard is removed from both normal and focus Workspace modes; the full customer profile remains available at `/leads/[leadId]`. Source and lead-score fields are not shown in the operator Workspace because they do not help the active call. The only operator write surface for client context remains append-only shared notes.

The Product Script panel receives a client-side **Expand script** action. Downloading or exporting script content is intentionally not available for security reasons. Expand is the reversible focus mode: the script becomes the dominant Workspace region, while the existing conversation brief, ClientProfileCard, Recent Context, Timeline, shared note history, and discovery questions move below it in the same page. No customer information is removed or duplicated; the operator reaches the detail context by vertical scrolling. The expanded state is not a modal: call controls and the customer identity remain available in the header. On narrower viewports, all sections reflow into one column without horizontal scrolling. Collapse restores the normal approved composition.
The Product Script panel receives a client-side **Expand script** action. Downloading or exporting script content is intentionally not available for security reasons. Expand is the reversible focus mode: the assigned-customer header, compact call context, script, and discovery questions remain the primary flow; notes follow immediately, then callback signals and Timeline. The expanded state is not a modal: call controls and customer identity remain available in the header. On narrower viewports, all sections reflow into one column without horizontal scrolling. Collapse restores the normal composition.

## Client Profile Experience

The existing lead detail page is renamed and redesigned as Client Profile:

1. A prominent identity header shows name, contact methods, lead status, and a read-only label.
2. A concise information section shows delivery address state, current profile note, and durable customer details.
3. A dedicated **Shared notes** section reuses the existing note write path. Notes remain append-only from the operator's perspective and show author and timestamp.
4. Customer history displays calls, orders, and the existing Customer 360 retention summary. The latest verified address identifies its source order and delivery date.
5. Back navigation returns to Workspace, while opening the profile in a separate tab leaves the operator's call work untouched.

## Delivery-Address Snapshot Data Model

The `orders` table gains a nullable `delivery_address_snapshot` JSONB column for legacy compatibility. Its validated object shape is:

```ts
{
  recipient_name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}
```

For every newly created physical order, the address is collected in both order-entry paths:

- `OrderCreateForm` for manual Orders creation;
- `ProductOrderPanel` for an order completed directly from an operator call.

The address passes through server-side input validation into the respective atomic RPCs: `create_order_with_items` and `complete_lead_call_with_order_items_idempotent`. The snapshot is written with the order and is not editable through Client Profile. Existing orders keep `NULL`; the migration never derives an address from `city`, `country`, notes, or an unrelated order.

The latest verified-address query selects the newest delivered order in the active workspace with a valid non-null snapshot, ordering by `delivered_at` and then `created_at`. A returned, cancelled, pending, in-progress, sent, or completed order cannot be the verified-address source.

## Security And Privacy

Delivery addresses are personal data. They are returned only through the existing workspace-scoped order and lead access paths. The migration does not weaken RLS, create a public view, or add a privileged public RPC. Existing operator assignment checks remain the gate for Client Profile access and note creation.

The address is a historical order snapshot, not a mutable customer-record field. The operator may enter it when placing a new order, but cannot later change client details from Client Profile.

## Implementation Boundaries

Expected touch points:

- Workspace composition, assigned-customer header, Product Script panel, and removal of the density preference.
- Client Profile route and a note section based on the existing lead-notes action and UI.
- Order creation form, post-call order panel, data-access DTOs, and both atomic order-creation RPC boundaries.
- A new Supabase migration, regenerated database types, and scoped activity/conversation reads needed for the address summary.

Out of scope:

- backfilling addresses for historic orders;
- editing customer records from Workspace or Client Profile;
- a second profile data store, a pop-out browser window, or changes to call routing.

## Verification

- Workspace tests prove that Compact / Extended controls are absent, the normal composition remains available, the profile link opens safely in a new tab, and expanded script mode moves the same customer context below the script without removing Timeline or shared notes.
- Profile tests prove that operators can add a note but cannot edit customer fields, and that an unassigned customer's profile remains inaccessible.
- Order tests cover address validation and atomic persistence for both manual and post-call order creation.
- Data tests prove that only the most recent delivered order with an address produces the verified-address view; cancelled, returned, and legacy orders do not.
- Migration and RLS checks confirm that address data remains workspace-scoped and that no public or unprivileged path can retrieve it.
