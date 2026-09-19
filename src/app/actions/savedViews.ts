"use server";

import {
  deleteSavedQualityViewForWorkspace,
  listSavedQualityViewsForWorkspace,
  saveQualityViewForWorkspace,
  type QualityReviewFilters,
  type SavedQualityView,
} from "@/lib/dal/savedViews";

export async function listSavedQualityViewsAction(): Promise<SavedQualityView[]> {
  return listSavedQualityViewsForWorkspace();
}

export async function saveQualityViewAction(input: {
  name: string;
  filters: QualityReviewFilters;
}): Promise<SavedQualityView> {
  return saveQualityViewForWorkspace(input);
}

export async function deleteSavedQualityViewAction(viewId: string): Promise<void> {
  await deleteSavedQualityViewForWorkspace(viewId);
}