function encodeArray(array) {
  let result = ""
  while (array.length > 0) {
    result += array.pop() 
    if(array.length != 0){
      result += "`"
    }
  }
  return result;
}

function decodeArray(encodedString, convertToNumber) {
  //pass true if want to convert to numerical value
  let result = []
  let accumulator = ""
  while (encodedString.length > 0) {
    let currentRemaining = encodedString.length
    let currentString = encodedString.substring(currentRemaining - 1, currentRemaining)
    encodedString = encodedString.substring(0, currentRemaining - 1)

    function reverse(s) {
      return s.split("").reverse().join("");
    }

    if (currentString != "`") {
      accumulator += currentString
      if (currentRemaining == 1) {
        if (convertToNumber) {
          result.push(Number(reverse(accumulator)))
        } else {
          result.push(reverse(accumulator))
        }
      }
    } else {
      if (convertToNumber) {
        result.push(Number(reverse(accumulator)))
      } else {
        result.push(reverse(accumulator))
      }
      accumulator = ""
    }
  }
  return result;
}

function appendVariableToUrl(variableName,value){
  return variableName + "=" + value
}