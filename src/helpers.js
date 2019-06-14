const hashMemo = new Map();
export const memoize = f => x => {
  if (hashMemo.has(x)) {
    return hashMemo.get(x)
  }
  else {
    const y = f(x);
    hashMemo.set(x, y);
    return y
  }
}

export const squareStyling = ({ pieceSquare }) => {
  return {[pieceSquare]: { backgroundColor: "rgba(255, 255, 0, 0.4)" }}
};
