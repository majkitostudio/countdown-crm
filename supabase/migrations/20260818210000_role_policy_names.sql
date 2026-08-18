-- Keep policy names aligned with the canonical human role vocabulary.
-- The predicates were migrated separately; this migration only renames policies.

ALTER POLICY "Workspace managers can create leads"
  ON public.leads RENAME TO "Team Leaders and Administrators can create leads";
ALTER POLICY "Workspace managers can delete leads"
  ON public.leads RENAME TO "Team Leaders and Administrators can delete leads";
ALTER POLICY "Workspace managers can update leads"
  ON public.leads RENAME TO "Team Leaders and Administrators can update leads";
ALTER POLICY "Workspace managers can view leads"
  ON public.leads RENAME TO "Team Leaders and Administrators can view leads";

ALTER POLICY "Workspace managers can manage objections"
  ON public.objections RENAME TO "Team Leaders and Administrators can manage objections";
ALTER POLICY "Workspace managers can manage products"
  ON public.products RENAME TO "Team Leaders and Administrators can manage products";
ALTER POLICY "Workspace managers can manage workflows"
  ON public.workflows RENAME TO "Team Leaders and Administrators can manage workflows";

ALTER POLICY "Workspace managers can insert custom objects"
  ON public.custom_objects RENAME TO "Team Leaders and Administrators can insert custom objects";
ALTER POLICY "Workspace managers can update custom objects"
  ON public.custom_objects RENAME TO "Team Leaders and Administrators can update custom objects";
ALTER POLICY "Workspace managers can delete custom objects"
  ON public.custom_objects RENAME TO "Team Leaders and Administrators can delete custom objects";
ALTER POLICY "Workspace managers can insert attribute definitions"
  ON public.attribute_definitions RENAME TO "Team Leaders and Administrators can insert attribute definitions";
ALTER POLICY "Workspace managers can update attribute definitions"
  ON public.attribute_definitions RENAME TO "Team Leaders and Administrators can update attribute definitions";
ALTER POLICY "Workspace managers can delete attribute definitions"
  ON public.attribute_definitions RENAME TO "Team Leaders and Administrators can delete attribute definitions";

ALTER POLICY "Operators and managers can delete training sessions"
  ON public.training_sessions RENAME TO "Operators and Team Leaders can delete training sessions";
ALTER POLICY "Training sessions are visible to owners and managers"
  ON public.training_sessions RENAME TO "Training sessions are visible to owners and Team Leaders";
