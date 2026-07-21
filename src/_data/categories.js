const products = require("./products.json");

const ORDER = ["Wall Art", "Home Decor", "Accessories", "Apparel", "Customized"];

module.exports = () => {
  return ORDER.map((name) => ({
    name,
    products: products.filter((p) => p.category === name),
  })).filter((group) => group.products.length > 0);
};
