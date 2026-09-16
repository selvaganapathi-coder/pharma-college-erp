export const COLLEGE_NAME = "GP Pharmacy College";
export const COLLEGE_SYSTEM = "College Management System";
export const COLLEGE_TAGLINE = "Learn • Practice • Lead";
export const COLLEGE_MOTTO = "Empowering Pharmacy Education";

export function collegeTitle(page?: string) {
  return page ? `${page} · ${COLLEGE_NAME}` : `${COLLEGE_NAME} · ${COLLEGE_SYSTEM}`;
}
