const linkPlaceholder = '&CLOUDFLARE_MPID';
const BRANDS = {
  JF: {
    NAME: 'justfab',
    TLD: {
      '.COM': 9,
      '.CA': 12,
      '.CO.UK': 11,
      '.DE': 10,
      '.FR': 14,
      '.ES': 15,
      '.NL': 19,
      '.DK': 20,
      '.SE': 21,
    },
  },
  SD: {
    NAME: 'shoedazzle',
    TLD: {
      '.COM': 17,
      '.CA': 17,
    },
  },
  FK: {
    NAME: 'fabkids',
    TLD: {
      '.COM': 13,
      '.CA': 13,
    },
  },
  FL: {
    NAME: 'fabletics',
    TLD: {
      '.COM': 16,
      '.DE': 22,
      '.CO.UK': 23,
      '.FR': 24,
      '.ES': 25,
      '.NL': 26,
      '.SE': 27,
      '.DK': 28,
      '.CA': 29,
    },
  },
  SX: {
    NAME: 'savagex',
    TLD: {
      '.COM': 34,
      '.FR': 35,
      '.DE': 36,
      '.ES': 38,
      '.CO.UK': 39,
      '.EU': 42,
    },
  },
};

const getBrand = (inputUrl) => {
  const currentUrl = inputUrl;
  const host = currentUrl.host;
  for (const [brand, info] of Object.entries(BRANDS)) {
    if (host.includes(info.NAME)) {
      return brand;
    }
  }
  return 'JF';
};

const getStoregroupId = (inputUrl, brand) => {
  const currentUrl = inputUrl;
  const host = currentUrl.host;
  const store = brand;
  const tlds = BRANDS[store].TLD;

  for (const [tld, sgid] of Object.entries(tlds)) {
    if (host.includes(tld.toLowerCase())) {
      return sgid;
    }
  }

  return 9;
};

const gatherResponse = async (response) => {
  const {headers} = response;
  const contentType = headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return await response.text();
  }

  return await response.json();
};

const replaceLink = (html, replacer, mpid) => {
  if (isNaN(parseInt(mpid)) || mpid.length < 5) return html;

  const replacement = mpid.length ? `&mpid=${mpid}` : '';
  let outputHTML = html.replace(replacer, replacement);

  return outputHTML;
};

class UserElementHandler {
  constructor({productId, brand, sgId, apiToken, apiKey, endpoint}) {
    this.productId = productId;
    this.brand = brand;
    this.sgId = sgId;
    this.apiToken = apiToken;
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async element(element) {
    const name = BRANDS[this.brand].NAME;
    const tld = Object.keys(BRANDS[this.brand].TLD).find(
      (key) => BRANDS[this.brand].TLD[key] === this.sgId
    );
    const mainRoute = `https://www.${name}${tld.toLowerCase()}`;
    const apiRoute = `${mainRoute}${this.endpoint}`;
    const apiInput = {
      page: 1,
      size: 1,
      masterProductIds: [parseInt(this.productId)],
      categoryIds: [],
      includeOutOfStock: true,
      warehouseId: null,
      productFields: [
        'label',
        'permalink',
        'product_images.default[1].sizes[3]',
      ],
    };

    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'x-api-key': this.apiKey,
        'x-service-token': this.apiToken,
        'x-tfg-storeGroupId': this.sgId,
      },
      body: JSON.stringify(apiInput),
    };
    let response = await fetch(apiRoute, init);

    if (response.status !== 200) {
      console.log(
        JSON.stringify(Object.fromEntries(response.headers), null, 2)
      );
    }
    // destructuring is fun
    const {products} = await gatherResponse(response).catch((e) =>
      console.log(e)
    );
    if (products.length) {
      const {
        label,
        permalink,
        product_images: {
          default: [, {sizes} = [images]],
        },
      } = products[0];
      const {height: imageHeight, width: imageWidth, url: imageUrl} = sizes[3];

      // Justfab
      const styleInsert = `
        <style type="text/css">
          .hoverable-image {
            position: relative;
          }
          .hoverable-image .main-image {
            opacity: 1;
            position: relative;
            transition: 0.2s ease all;
            z-index: 2;
          }
          .hoverable-image:hover .main-image {
            opacity: 0;
          }
          .hoverable-image .hover-image {
            left: 0;
            position: absolute;
            top: 0;
            z-index: 1;
          }
          .shot {
            display: inline-block;
          }
          @media (max-width: 992px){
            .mpid-container .main-image {width:50%;height:50%;}
            .mpid-container .hover-image {width:50%;height:50%;}
          }
        </style>`;
      // Justfab
      const productInsert = `
        <div class="mx-auto">
          <section class="mt-lg-5 mpid-margin" style="width: 100%">
            <div
              class="img-fluid d-flex justify-content-lg-center justify-content-xl-center"
              data-toggle="tooltip"
              data-bs-tooltip="Shop This Style"
              style="
                width: 100% !important;
                margin: auto;
              "
              title="Shop This Style Now"
            >
              <div id="products_container_0">
                <div class="item">
                  <a
                    href="${mainRoute}/products/${permalink}"
                    class="shot hoverable-image"
                  >
                    <img
                      class="main-image"
                      src="${imageUrl}"
                      alt="${label}"
                      width="${imageWidth}"
                      height="${imageHeight}"
                    />
                    <img
                      class="hover-image"
                      src="${imageUrl.replace('-2_', '-6_')}"
                      alt="${label}"
                      width="${imageWidth}"
                      height="${imageHeight}"
                    />
                  </a>
                  <div class="name">${label}<br/></div>
                </div>
              </div>
            </div>
          </section>
        </div>`;
      element.before(styleInsert, {html: true});
      element.setInnerContent(productInsert, {html: true});
    }
  }
}

const urlParameters = (requestUrl) => {
  const searchParams = requestUrl.searchParams;
  const searchString = searchParams.toString();
  const parameterOutput = {
    hasParams: false,
    initialParams: '',
    modifiedParams: '',
    mpid: '',
  };

  if (!searchString) {
    return parameterOutput;
  }

  parameterOutput.hasParams = true;
  parameterOutput.initialParams = searchString;
  parameterOutput.modifiedParams = searchString.replaceAll('IAMAPERIOD', '.');

  if (
    searchParams.has('mpid') &&
    searchParams.get('mpid').length > 5 &&
    !isNaN(parseInt(searchParams.get('mpid')))
  ) {
    parameterOutput.mpid = searchParams.get('mpid');
  }

  return parameterOutput;
};

const mpidMiddleware = async ({request, env, next}) => {
  const inputUrl = new URL(request.url);
  const filterParameters = urlParameters(inputUrl);
  
  try {
    let response = await next();

    if (filterParameters.hasParams && filterParameters.mpid.length) {
      const brand = getBrand(inputUrl);
      const storeId = getStoregroupId(inputUrl, brand);
      const apiKey = env[`${brand}_KEY`];
      const apiToken = env[`${brand}_TOK`];
      const endpoint = env.ENDPOINT;
      let HTML = await response.text();
      HTML = replaceLink(HTML, linkPlaceholder, filterParameters.mpid);

      response = new Response(HTML, {
        headers: response.headers,
      });

      return new HTMLRewriter()
        .on(
          `div#cloudflare_${brand.toLowerCase()}_container_placeholder`,
          new UserElementHandler({
            productId: filterParameters.mpid,
            brand: brand,
            sgId: storeId,
            apiToken: apiToken,
            apiKey: apiKey,
            endpoint: endpoint,
          })
        )
        .transform(response);
    }

    let HTML = await response.text();
    HTML = HTML.replace(linkPlaceholder, '');

    response = new Response(HTML, {
      headers: response.headers,
    });

    return response;
  } catch (error) {
    return new Response(`Error: ${error}`, {
      status: 500,
      statusText: "Internal Server Error",
    })
  }
};

export const onRequest = [mpidMiddleware];
