// Until the custom domain (elizabetharnau.com) is live, GitHub Pages serves
// this repo as a project site under /elizabetharnau.com/, not at root. Once
// DNS cutover happens (see migration plan Phase 6) and a CNAME file is added,
// set PATH_PREFIX to "/" (or unset it) so assets resolve at the domain root.
const pathPrefix = process.env.PATH_PREFIX || "/elizabetharnau.com/";

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Two problems with links carried over from the WordPress mirror:
  // 1. Nav/footer/content links point at the live elizabetharnau.com site
  //    (that's where they pointed in the original HTML) instead of staying
  //    on this site - rewrite self-references to root-relative paths.
  // 2. Root-relative paths (/assets/..., /product/..., data-item-url="/...")
  //    need the GitHub Pages project-site prefix until the custom domain
  //    is live (see pathPrefix comment above).
  eleventyConfig.addTransform("fix-links", function (content) {
    if (!this.page || !this.page.outputPath || !this.page.outputPath.endsWith(".html")) {
      return content;
    }
    content = content.replace(
      /(href|data-item-url)="https?:\/\/(www\.)?elizabetharnau\.com/g,
      '$1="'
    );
    if (pathPrefix !== "/") {
      content = content
        .replace(/(href|src|data-item-url)="\//g, `$1="${pathPrefix}`)
        .replace(/url\(\/assets\//g, `url(${pathPrefix}assets/`);
    }
    return content;
  });

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
