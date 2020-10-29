const superagent = require("superagent");
const cheerio = require("cheerio");
const fs = require("fs");
const Promise = require("bluebird");

const landingUrl = "https://www.cermati.com/artikel";
superagent
  .get(landingUrl)
  .then((landing_result) => {
    const raw_html = landing_result.text;
    
    //getting list of links
    var $ = cheerio.load(raw_html);
    var article_urls = [];
    $("div.list-of-articles")
      .children("div.article-list-item")
      .each((i, elem) => {
        article_urls[i] =
          landingUrl +
          $(elem).children("a").attr("href").replace("/artikel", "");
      });
    
    //putting links into an array of promises
    var promises = []
    for (var i = 0; i < article_urls.length; i++) {
      promises.push(
        new Promise((resolve, reject) => {

            //saving active url for promise
            const active_url = article_urls[i]
            superagent.get(active_url).then((article_result) => {
            const raw_article = article_result.text;
            $ = cheerio.load(raw_article);
            var storedArticles = [];

            //eliminating side list panel to get related articles
            $("div.side-list-panel").each((i, elem) => {
              if (
                $(elem).children("h4.panel-header").text() === "Artikel Terkait"
              ) {
                $(elem)
                  .children("ul.panel-items-list")
                  .children("li")
                  .children("a")
                  .each((j, inner_elem) => {
                    storedArticles[j] = {
                      url: landingUrl + $(inner_elem).attr("href").replace('/artikel',''),
                      title: $(inner_elem).children("h5.item-title").text(),
                    };
                  });
              }
            });

            //putting everything together
            var articleInfo = {
              url: active_url,
              title: $("h1.post-title").text(),
              author: $("span.author-name").text().trim(),
              postingDate: $("span.post-date").text().trim(),
              relatedArticles: storedArticles,
            };
            return resolve(articleInfo)
            

          }).catch((err) => {
            console.log(err);
            reject(err)
          })
        })
      );
    }

    //applying promise to parallelize
    Promise.all(promises).then(promise_results=>{
      var finalJson = {
        articles: promise_results
      }
        var jsonContent = JSON.stringify(finalJson,null,3)
          fs.writeFile('solution.json',jsonContent,res=>{
          console.log('JSON record created')
      })
    })
  })
  .catch((err) => {
    console.log(err);
  });
