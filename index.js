const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

let title;

const getApiURLs = async () => {
  try {
    const { data } = await axios.get(
      "https://docs.oracle.com/en/java/javase/11/docs/api/allclasses.html"
    );
    const $ = cheerio.load(data);
    const links = $("a");
    const validUrls = [];

    for (const link of links) {
      const href = link.attribs.href;
      validUrls.push(
        "https://docs.oracle.com/en/java/javase/11/docs/api/" + href
      );
    }

    return validUrls;
  } catch (error) {
    throw error;
  }
};

const getParameters = (fullSignature) => {
  let parameters = [];
  const paramsWithCommas = fullSignature.split("(")[1].split(/(\s+)/);
  if (paramsWithCommas.length <= 1) {
    return [" "];
  }
  for (let index = 0; index < paramsWithCommas.length; index++) {
    if (index % 4 === 0) parameters.push(paramsWithCommas[index]);
  }
  return parameters;
};

const readJavaDoc = async (url) => {
  try {
    const fieldName = [];
    const constructorsNames = [];
    const constructorsParams = [];
    const methodNames = [];
    const methodParams = [];
    const returnNames = [];
    const enumValues = [];

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let gettingFields = true;
    let isEnum = false;

    $("h2.title").each((i, data) => {
      title = $(data).text().split("<")[0];
    });

    $(".memberSummary > tbody > tr > .colFirst").each((i, data) => {
      const returnDataText = $(data).text();
      if (
        returnDataText != "Constructor" &&
        returnDataText != "Modifier" &&
        returnDataText != "protected " &&
        returnDataText != "private " &&
        returnDataText != "public " &&
        returnDataText.length > 1
      ) {
        if (returnDataText.includes("Enum")) {
          isEnum = true;
        }
        if (returnDataText.includes("Modifier and Type")) {
          isEnum = false;
        }
        if (isEnum) {
          if (!returnDataText.includes("Enum")) {
            enumValues.push(returnDataText);
          }
        } else {
          if (!returnDataText.includes("Modifier and Type")) {
            returnNames.push(returnDataText);
          }
        }
      }
    });

    $(".memberSummary > tbody > tr > .colConstructorName").each((i, data) => {
      const constructorDataText = $(data).text();
      constructorsNames.push(constructorDataText.split("(")[0]);
      constructorsParams.push(getParameters(constructorDataText));
    });

    $(".memberSummary > tbody > tr > .colSecond").each((i, data) => {
      let methodDataText = $(data).text();

      if (gettingFields) {
        if (methodDataText === "Method") {
          gettingFields = false;
        } else if (
          methodDataText != "Field" &&
          methodDataText != "Constructor"
        ) {
          fieldName.push(methodDataText);
        }
      } else {
        methodNames.push(methodDataText.split("(")[0]);
        methodParams.push(getParameters(methodDataText));
      }
    });

    printData(
      fieldName,
      constructorsNames,
      constructorsParams,
      methodNames,
      methodParams,
      returnNames,
      enumValues
    );
  } catch (error) {
    throw error;
  }
};

function printData(
  fieldName,
  constructorsNames,
  constructorsParams,
  methodNames,
  methodParams,
  returnNames,
  enumValues
) {
  let output = [];

  try {
    if (fieldName.length > 0) {
      output.push("\nFIELD NAME,,TYPE");
      for (let index = 0; index < fieldName.length; index++) {
        output.push(fieldName[index] + ",," + returnNames[index]);
      }
    }

    if (enumValues.length > 0) {
      output.push("\nENUM VALUE");
      for (const enumName of enumValues) {
        output.push(enumName);
      }
    }

    if (constructorsNames.length > 0) {
      output.push("\nCONSTRUCTOR, PARAM");
      for (let index = 0; index < constructorsNames.length; index++) {
        output.push(
          constructorsNames[index] + "," + constructorsParams[index].join(" ")
        );
      }
    }

    if (methodNames.length > 0) {
      output.push("\nMETHOD NAME,PARAMETERS,RETURN");
      for (
        let index = 0;
        index < returnNames.length - fieldName.length;
        index++
      ) {
        output.push(
          methodNames[index] +
            "," +
            methodParams[index].join(" ") +
            "," +
            returnNames[index + fieldName.length]
        );
      }
    }
    const writeStream = fs.createWriteStream(".\\outputs\\" + title + ".csv");
    writeStream.write(title + " \n");
    writeStream.write(output.join("\n"));
  } catch (error) {
    console.log(returnNames);
    console.log(title);
    console.log(error);
  }
}

numberOfClassesToRead = 200;

getApiURLs().then((validUrls) => {
  let randomNumbers = Array.from(
    { length: numberOfClassesToRead },
    () => Math.floor(Math.random() * validUrls.length) + 1
  );
  for (let index = 0; index < randomNumbers.length; index++) {
    setTimeout(() => readJavaDoc(validUrls[randomNumbers[index]]), 100);
  }
});
