// Until the custom domain (elizabetharnau.com) is live, GitHub Pages serves
// this repo as a project site under /elizabetharnau.com/, not at root. Once
// DNS cutover happens (see migration plan Phase 6) and a CNAME file is added,
// set PATH_PREFIX to "/" (or unset it) so assets resolve at the domain root.
const pathPrefix = process.env.PATH_PREFIX || "/elizabetharnau.com/";

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  if (pathPrefix !== "/") {
    eleventyConfig.addTransform("fix-root-paths", function (content) {
      if (!this.page || !this.page.outputPath || !this.page.outputPath.endsWith(".html")) {
        return content;
      }
      return content
        .replace(/(href|src)="\/assets\//g, `$1="${pathPrefix}assets/`)
        .replace(/url\(\/assets\//g, `url(${pathPrefix}assets/`);
    });
  }

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    pathPrefix,
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
