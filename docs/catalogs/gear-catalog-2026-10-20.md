# Verified undershirts and nose-tape ownership

Irish Jamo Sleeves were checked in the user's running CollegeFB27 process on
October 20, 2026 using ordinary read/query access only. All four records have
matching repeated ItemName fields and DisplayName at +56. No process writes,
injection, elevation or raw memory dumps were used.

| ItemName | Display name | Pool / save slot |
| --- | --- | --- |
| G_CompressionT_Crew_ShortSleeve_BasicJ_WHI | Irish Jamo Sleeves White | Unlocked / InnerShirt |
| G_CompressionT_Crew_ShortSleeve_BasicJ_BLA | Irish Jamo Sleeves Black | Unlocked / InnerShirt |
| G_CompressionT_Crew_ShortSleeve_BasicJ_PRI | Irish Jamo Sleeves Primary | Unlocked / InnerShirt |
| G_CompressionT_Crew_ShortSleeve_BasicJ_SEC | Irish Jamo Sleeves Secondary | Unlocked / InnerShirt |

These use the established torso-undershirt family/slot. All four colors are in
the optional Unlocked undershirt pool and form a recolor family. They are not
RAW or vanilla generated additions. In-game fit should still be checked.

In v21.0, the Irish Jamo category defaults to a 0% chance. Explicit saved choices
are preserved, and all four variants remain available for opt-in selection.

## Taped Wrist with Cross

The same read-only session also verified `GearWrist_wristTapedMax_WhiteCross`:
repeated ItemName fields and two DisplayName +56 references agree on
**Taped Wrist with Cross**. The optional Unlocked pool uses the established
LeftWristWear / RightWristWear slots and wrist-tape tag from wristTapedMax.
No cross variants in other colors were verified; recoloring preserves this
design instead of inventing a different asset. Generation avoids full sleeve
coverage and elbow-slot accessories that occupy the wrist. Visual fit still
needs the usual in-game check. Filtered diagnostic addresses stay in ignored
local outputs and are not packaged or published.

The earlier verified mod catalog already assigns Nose Tape GABOS, Kill Everybody,
Trust God and Custom 1–10 to Unlocked, not RAW. Their exact IDs are
FaceMarks_NoseTape_G / _KE / _T and FaceMarks_NoseTape_C1 through _C10.
FaceMarks_RawNoseTape_killall is a separate RAW design and stays in RAW.

The four Relaxed Tee colors were confirmed from the user's equipped SJSU
quarterbacks in DYNASTY-UNDERSHIRTEXAMPLE. Their recolor assignments did not need
changing; the shared display-name resolver now uses the verified labels.
