/**
 * Склонение существительных после числительных в русском языке
 * @param {number} number - число
 * @param {string[]} forms - массив из 3 форм: [1, 2-4, 5+] (например: ['запись', 'записи', 'записей'])
 * @returns {string} - правильная форма слова
 */
export const declension = (number, forms) => {
  const n = Math.abs(number);
  const n10 = n % 10;
  const n100 = n % 100;

  if (n100 >= 11 && n100 <= 19) {
    return forms[2];
  }

  if (n10 === 1) {
    return forms[0];
  }

  if (n10 >= 2 && n10 <= 4) {
    return forms[1];
  }

  return forms[2];
};
