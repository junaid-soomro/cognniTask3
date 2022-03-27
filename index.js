const vocabCol = require("./Schema/vocabCollection");
const inputText = require("./inputText");

let vocabs = null;
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
  let tokenizedText = inputText; //storing tokenized text separately.

  const vocabGenerator = { regex: {}, text: {} }; //term types

  const uniqueWords = [...new Set(extractWordsFromString(inputText))];

  //Here we create our unique vocabs object having array of string terms pushed to dictOfVocabs.
  vocabs.vocabCollection.map((vocab) => {
    const { termType, term, token } = vocab;
    const firstWordInTerm = extractWordsFromString(term, true);
    if (!Array.isArray(vocabGenerator[termType][firstWordInTerm])) {
      vocabGenerator[termType][firstWordInTerm] = [];
    }

    //making sure only unique vocabs are pushed
    if (!(term in vocabGenerator[termType][firstWordInTerm])) {
      vocabGenerator[termType][firstWordInTerm].push(term);
    }
  });

  //Here we find our unique terms found in the inputText
  const uniqueTerms = [];
  Object.keys(vocabGenerator).map(vocabType => {
    for (let i = 0; i < uniqueWords.length; i++) {
      if (vocabGenerator[vocabType][uniqueWords[i]]) {
        const termMatched = vocabGenerator[vocabType][uniqueWords[i]].filter((term) =>
          inputText.includes(term)
        );
  
        if (termMatched.length > 0) {
          termMatched.forEach((item) => {
            if(!(item in uniqueTerms)) {
              tokenizedText.replaceAll(tokenizedText, item, )
              uniqueTerms.push(item);
            } 
            

          });
        }
      }
    }
  })

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
          $push: {
            token: "$vocabCollection.token",
            term: "$vocabCollection.term",
          },
        },
      },
    },
  ]);

  let finalData = {};
  let queriedData;

  if (matchingTermsTokens && Array.isArray(matchingTermsTokens)) {
    queriedData =
      "token" in matchingTermsTokens[0] ? matchingTermsTokens[0]["token"] : [];
  }

  queriedData.map(({ token }) => {
    if (token in finalData) {
      finalData[token] += 1;
    } else {
      finalData[token] = 1;
    }
  });

  console.log("DATA PROCESSED..", finalData);
})();

const extractWordsFromString = (input, firstWordOnly = false) => {
  const text = input.replaceAll(/[^a-zA-Z0-9 ]/g, "").split(" ");
  if (firstWordOnly) return text[0];
  return text;
};
