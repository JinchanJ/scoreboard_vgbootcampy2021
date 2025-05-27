# scoreboard_vgbootcampy2021

# How to add new info to the tournament container on the top left and player twitter container:

When adding new info to the tournament, you will need to add a variable name to matchDisplayModes.
Then, you need to define where to get that information in the getMatchDisplayFieldMap function.

Ex. Adding phase:

Add "phase" to matchDisplayModes like this:

matchDisplayModes: ["match", "best_of_text", "phase"]

Then add where to get phase in getMatchDisplayFieldMap function:

function getMatchDisplayFieldMap(score) {
return {
"match": score.match,
"best_of_text": score.best_of_text,
"phase": score.phase
};
}
