const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/User");
const Community = require("../models/Community");
const kleur = require("kleur");
const LOG = console.log;

// Set up the readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
mongoose.set("strictQuery", false);
// Connect to the database
mongoose
  .connect(
    "mongodb://127.0.0.1:27017/db_socialecho",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    LOG(kleur.green().bold("✅ Connected to MongoDB"));
    start();
  })
  .catch((err) => {
    LOG(kleur.red().bold("❌ Error connecting to database" + err.message));
    process.exit(1);
  });

async function start() {
  try {
    // Get the moderators from the database
    const moderators = await User.find({ role: "moderator" });

    // Prompt the user to choose a moderator to add
    const modChoice = await promptUserChoice(
      kleur
        .blue()
        .bold("Which moderator would you like to add? (Enter the number)"),

      moderators.map((mod, index) => `${index + 1}. ${mod.name} - ${mod.email}`)
    );

    const moderatorToAdd = moderators[modChoice - 1];
    if (!moderatorToAdd) {
      LOG(kleur.red().bold("❌ Error! Moderator not found."));
      return;
    }

    // Get the community names from the database
    const communities = await Community.find({}, { name: 1, _id: 0 });
    const communityNames = communities.map((community) => community.name);

    // Prompt the user to choose a community to add the moderator to
    const communityName = await promptUserInput(
      kleur
        .blue()
        .bold(
          "Which community would you like to add the moderator to? (Enter the number)"
        ),

      communityNames
    );

    const chosenCommunity = await Community.findOne({ name: communityName });

    // Check if the community exists
    if (!chosenCommunity) {
      LOG(
        kleur
          .yellow()
          .bold(
            `⚠️ Warning: Community does not exist. Please select a valid community.`
          )
      );

      process.exit(1);
    }

    // Check if the chosen moderator is already a moderator of the community
    if (
      chosenCommunity.moderators.length > 0 &&
      chosenCommunity.moderators.includes(moderatorToAdd._id)
    ) {
      LOG(
        kleur
          .yellow()
          .bold(
            `⚠️ Warning: ${kleur.white(
              moderatorToAdd.name
            )} is already a moderator of ${kleur.white(
              communityName
            )} community!`
          )
      );

      process.exit(1);
    }
    // Add the moderator to the community
    await Community.findOneAndUpdate(
      { name: communityName },
      {
        $addToSet: {
          moderators: moderatorToAdd._id,
          members: moderatorToAdd._id,
        },
      },
      { new: true }
    );
    LOG(
      kleur
        .green()
        .bold(
          `✅ Done! ${kleur.white(
            moderatorToAdd.name
          )} has been added as a moderator and member of ${kleur.white(
            communityName
          )} community.`
        )
    );

    rl.close();
    process.exit(0);
  } catch (err) {
    LOG(kleur.red().bold("❌ Error: " + err.message));
    process.exit(1);
  }
}

// Prompt the user for input
function promptUserInput(promptText, options) {
  return new Promise((resolve) => {
    if (options && options.length > 0) {
      LOG(kleur.blue().bold("Select an option:"));
      options.forEach((option, index) =>
        LOG(kleur.blue().bold(`${index + 1}. ${option}`))
      );
    }
    rl.question(`${promptText} `, (answer) => {
      const communityName = options[parseInt(answer) - 1];
      resolve(communityName);
    });
  });
}

async function promptUserChoice(prompt, choices) {
  return new Promise((resolve, reject) => {
    rl.question(`${prompt}\n${choices.join("\n")}\n`, (answer) => {
      const choiceIndex = parseInt(answer, 10) - 1;
      if (
        isNaN(choiceIndex) ||
        choiceIndex < 0 ||
        choiceIndex >= choices.length
      ) {
        reject(new Error(kleur.red().bold("❌ Invalid choice")));
      } else {
        resolve(choices[choiceIndex].split(". ")[0]);
      }
    });
  });
}
