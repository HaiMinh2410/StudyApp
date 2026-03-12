const text = '9. C – will have prepared';
const qNumMatch = text.match(/^(\d+)[\.\)]\s*(.*)/);
console.log('qNumMatch:', qNumMatch?.[1], qNumMatch?.[2]);
if (qNumMatch) {
    const r = qNumMatch[2].trim();
    // Using the exact regex from the code
    const mcqMatch = r.match(/^([A-D])(?:[\s-–—:\.](.*))?$/i);
    console.log('mcqMatch:', mcqMatch?.[1], mcqMatch?.[2]);
}
