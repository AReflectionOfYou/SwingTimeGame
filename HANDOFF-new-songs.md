# Hand-off: eight new songs for Swing Time

Prepared in a Claude chat session for Claude Code to finish. **Delete this file before committing.**

## What changed

- 8 new song files in `songs/`, all marked "PROPOSED for owner review" in their `_about`:
  `mary-had-a-little-lamb`, `twinkle-twinkle-little-star`, `amazing-grace`, `deck-the-halls`,
  `away-in-a-manger`, `the-first-noel`, `o-come-all-ye-faithful`, `good-king-wenceslas`.
- `songs/index.json`: the new songs added and the list regrouped (simple tunes, then Amazing Grace,
  then the carols). Ode to Joy stays first, so the Demo song is unchanged.
- No code changes.

This work is on the branch **`add-eight-songs`** on GitHub, one commit on top of the current `main`
(after "retune bells and fix demo harmonies"). Work from that branch.

The same files were also dropped into the owner's local clone as uncommitted changes before the branch
existed. Discard those local copies first (GitHub Desktop: right-click the changed files → Discard changes),
then fetch and check out `add-eight-songs`, so git does not complain about untracked files in the way.

All songs were re-checked against the current `main` code (including its new rule that parts in unison share
one bell) with the same results as below.

## Where each melody came from

| Song | Source | Checked |
|---|---|---|
| Amazing Grace | Open Hymnal Project score (NEW BRITAIN), transposed G to C | note for note |
| Away in a Manger | Open Hymnal Project score (MUELLER, Hymnal for American Youth 1919), F to C | note for note |
| O Come, All Ye Faithful | Open Hymnal Project score (ADESTE FIDELES), G to C | note for note |
| The First Noel | Open Hymnal Project score, D to C | note for note |
| Good King Wenceslas | Mutopia Project score (Hutchins, *Carols Old and Carols New*, 1916), A to C | note for note |
| Deck the Halls | ABC transcription in C, folktunefinder.com tune 11542 | note for note, one note simplified (below) |
| Mary Had a Little Lamb | standard nursery melody | from memory only, check by ear |
| Twinkle, Twinkle, Little Star | standard melody ("Ah! vous dirai-je, maman") | from memory only, check by ear |

The hymnal scores were read by a small ABC reader that was first tested against the existing
`joy-to-the-world.json`: it reproduced all 57 notes and their rhythm exactly.

All melodies use only the 15 bells (Do to Do3, no sharps or flats), with one exception:

- **Deck the Halls** has one F-sharp in the third line ("fa la la la la la la la la" after "See the
  blazing Yule before us"). It is played as a plain F (`Fa2`). It sounds a little different there; adding an
  F-sharp bell later would restore it. The bass under that bar is Re, which suits the plain F.

## Arrangements

Proposed by a search that (1) never asks a phone to ring two notes at once, (2) spreads quick
back-to-back notes across players, using the same ringing rules as `js/songs.js`, and (3) fills spare gestures
with doubled notes that take turns (`alternate`), then with notes the song never uses.

- 1 and 2 phones: melody only. 3 and 4 phones: melody plus a simple bass (the score's bass on beat 1 of each
  bar, or written roots for Mary, Twinkle and Deck), unless the bass made it clearly harder to play.
  Deck the Halls (both sizes), O Come All Ye Faithful (3 phones) and The First Noel (3 phones) ended up
  melody only for that reason.
- Sizes offered: Mary 1–4; Deck the Halls 3–4 (it uses nine notes, too many for 2 phones); all others 2–4.
- Busiest arrangements (back-to-back swings on one phone under about 0.9 s at the set tempo):
  The First Noel with 2 phones (14 spots, all about 0.7 s), O Come All Ye Faithful with 2 phones (4),
  Away in a Manger with 2 phones (4). The 3- and 4-phone versions of every song are easy.
- Tempos are starting guesses for family play: Amazing Grace 66, Away in a Manger 76, O Come 84,
  The First Noel 84, Deck the Halls 84, Twinkle 92, Good King Wenceslas 96, Mary 100.

## Checks already done

- Every song resolved at every size with the app's own `js/songs.js` (run in Node): no warnings, every
  melody note rung, Toddler mode available for all eight.
- In a headless browser: the host screen lists all 14 songs with the right phone counts; Good King Wenceslas
  with 4 phones runs its scrolling score; the phone page loads for Deck the Halls (3 phones), Mary
  (1 phone), and The First Noel in Toddler mode. No page errors.

## Left for Claude Code and the owner

1. Pull `main`, then run the app and let the owner listen to each song (Demo-style playback is the quickest
   way). Fix any note that sounds wrong; Mary and Twinkle were not checked against a score.
2. Adjust tempos by ear.
3. Review the layouts, especially the busy 2-phone ones. If The First Noel is too hard for 2 people, drop its
   `"2"` arrangement.
4. Decide whether the regrouped song order in `songs/index.json` is wanted.
5. Optional later: add an F-sharp bell (the InspectorJ pack has one) and restore the note in Deck the Halls.
6. Delete this file, then commit, for example: "Add eight songs: Mary, Twinkle, Amazing Grace, and five carols".

## Sources

- Open Hymnal Project: https://github.com/mzealey/openhymnal (files under `Complete/`)
- Mutopia Project, Good King Wenceslas: https://github.com/MutopiaProject/MutopiaProject (`ftp/Anonymous/GoodKingWenceslas`)
- Deck the Halls ABC: https://new.folktunefinder.com/tunes/11542
