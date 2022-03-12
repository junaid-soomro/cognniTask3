const vocabCol = require("./Schema/vocabCollection");
const inputText = require("./inputText");

let vocabs;
vocabCol.findOne({}).then((data) => (vocabs = data));

(async () => {
  if (!(await require("./singletonConnection").getConnection())) {
    await require("./singletonConnection").initConnection();
  }

  //check if the data has been loaded in the memory or not.
  await new Promise((resolve, reject) => {
    let interval = setInterval(() => {
      if (
        vocabs &&
        Array.isArray(vocabs.vocabCollection) &&
        typeof inputText == "string"
      ) {
        clearInterval(interval);
        resolve();
      }
    }, 5000);
  });
  let dictOfVocab = {};

  const uniqueWords = [...new Set(extractWordsFromString(inputText))];

  vocabs.vocabCollection.map((vocab) => {
    const firstWordInTerm = extractWordsFromString(vocab?.term, true);
    if (!Array.isArray(dictOfVocab[firstWordInTerm])) {
      dictOfVocab[firstWordInTerm] = [];
    }

    //making sure only unique vocabs are pushed
    if (!(vocab?.term in dictOfVocab[firstWordInTerm])) {
      dictOfVocab[firstWordInTerm].push(vocab?.term);
    }
  });

  const uniqueTerms = [];
  for (let i = 0; i < uniqueWords.length; i++) {
    if (dictOfVocab[uniqueWords[i]]) {
      const termMatched = dictOfVocab[uniqueWords[i]].filter((term) =>
        inputText.includes(term)
      );

      if (termMatched.length > 0) {
        termMatched.forEach((item) =>
          !(item in uniqueTerms) ? uniqueTerms.push(item) : null
        );
      }
    }
  }

  //Now we fetch tokens from db.
  const matchingTermsTokens = await vocabCol.aggregate([
    {
      $unwind: {
        path: "$vocabCollection",
      },
    },
    {
      $match: {
        "vocabCollection.term": {
          $in: uniqueTerms,
        },
      },
    },
    {
      $group: {
        _id: null,
        token: {
          $push: "$vocabCollection.token",
        },
      },
    },
  ]);

  let finalData = [];
  let uniqueTokenTermCount = 0;
  let uniqueTokenTerms = [];
  let queriedData;

  if (matchingTermsTokens && Array.isArray(matchingTermsTokens)) {
    queriedData =
      "token" in matchingTermsTokens[0] ? matchingTermsTokens[0]["token"] : [];
  }

  for (let i = 0; i < queriedData.length; i++) {
    //find all the terms for this token
    for (let j = 0; j < vocabs.vocabCollection.length; j++) {
      if (
        vocabs.vocabCollection[j]["token"] == queriedData[i] &&
        !(vocabs.vocabCollection[j]["term"] in uniqueTokenTerms)
      ) {
        //count number of unique terms for each token
        uniqueTokenTermCount++;
        uniqueTokenTerms.push(vocabs.vocabCollection[j]["term"]);
      }
    }
    finalData.push({
      token: queriedData[i],
      uniqueTermCountForToken: uniqueTokenTermCount,
      top50TermsForToken: uniqueTokenTerms.slice(0, 49),
    });
    uniqueTokenTermCount = 0;
    uniqueTokenTerms = [];
  }

  console.log("DATA PROCESSED..", finalData);
})();

const extractWordsFromString = (input, firstWordOnly = false) => {
  const text = input.replaceAll(/[^a-zA-Z0-9 ]/g, "").split(" ");
  if (firstWordOnly) return text[0];
  return text;
};
