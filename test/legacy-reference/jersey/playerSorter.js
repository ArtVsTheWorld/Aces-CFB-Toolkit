// Player Sorter: QBs choose first, FBs last, and everyone else chooses by
// OverallRating first, then actual age and eligibility seniority/redshirt history.

const YEAR_PRIORITY = { Senior: 6, Junior: 4, Sophomore: 2, Freshman: 0 };
const OL = new Set(["LT", "LG", "C", "RG", "RT"]);
const positionTier = player => {
    if (player.Position === "QB") return 0;
    if (OL.has(player.Position)) return 2;
    if (["K", "P", "FB"].includes(player.Position)) return 3;
    return 1;
};
const seniority = player => (YEAR_PRIORITY[player.SchoolYear] ?? 0) + (player.RedshirtStatus === "Previous" ? 1 : 0);

export function sortRoster(roster) {
    roster.sort((a, b) => {
        const positionDifference = positionTier(a) - positionTier(b);
        if (positionDifference !== 0) return positionDifference;
        const overallDifference = Number(b.OverallRating ?? 0) - Number(a.OverallRating ?? 0);
        if (overallDifference !== 0) return overallDifference;
        const ageDifference = Number(b.Age ?? 0) - Number(a.Age ?? 0);
        if (ageDifference !== 0) return ageDifference;
        const seniorityDifference = seniority(b) - seniority(a);
        if (seniorityDifference !== 0) return seniorityDifference;
        return `${a.LastName ?? ""},${a.FirstName ?? ""}`.localeCompare(`${b.LastName ?? ""},${b.FirstName ?? ""}`);
    });
}
