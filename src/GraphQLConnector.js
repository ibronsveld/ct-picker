"use strict";

import {createClient} from "@commercetools/sdk-client";
import {createAuthMiddlewareForClientCredentialsFlow} from "@commercetools/sdk-middleware-auth";
import {createHttpMiddleware} from "@commercetools/sdk-middleware-http";
import {createRequestBuilder, features} from "@commercetools/api-request-builder";

const someQuery = {
  query: '  query productsList($skus:[String!]) {\n' +
    '        products(skus:$skus) {\n' +
    '            results {\n' +
    '                id\n' +
    '                key\n' +
    '                version\n' +
    '              masterData {\n' +
    '                current {\n' +
    '             \t\t\tcategories {\n' +
    '                    nameAllLocales {\n' +
    '                      locale,\n' +
    '                      value\n' +
    '                    }\n' +
    '                  },\n' +
    '                  nameAllLocales {\n' +
    '                    locale\n' +
    '                    value\n' +
    '                  },                  \n' +
    '                  masterVariant{\n' +
    '                  \tsku,                     \n' +
    '                    images {\n' +
    '                      url\n' +
    '                      label\n' +
    '                    }\n' +
    '                  }                            \n' +
    '                }\n' +
    '              }\n' +
    '            }\n' +
    '        }\n' +
    '    }'
};

class GraphQLQuery {

  constructor(builder) {
    this.queryBody = {
      query: builder.query,
      variables: builder.variables
    }

    this.options = builder.options;

    // Create client and request builder
    this._ctpClient = createClient({
      // The order of the middlewares is important !!!
      middlewares: [
        createAuthMiddlewareForClientCredentialsFlow({
          host: this.options.authUri,
          projectKey: this.options.projectKey,
          credentials: {
            clientId: this.options.clientId,
            clientSecret: this.options.clientSecret
          }
        }, fetch),
        createHttpMiddleware({host: this.options.apiUri}, fetch)
      ]
    });
    this._requestBuilder = createRequestBuilder({
      projectKey: this.options.projectKey,
      customServices: {
        graphql: {
          type: 'graphql',
          endpoint: '/graphql',
          features: [features.query]
        }
      }
    });
  }

  execute() {
    let self = this;

    let queryRequest = {
      uri: self._requestBuilder.graphql.build(),
      method: 'POST',
      body: self.queryBody
    };

    return self._ctpClient.execute(queryRequest).then((data) => {
      console.log('graphql result', data);
      return data;
    }).catch((err) => {
      console.error('graphql error', err);
      throw err;
    })
  }
}

class GraphQLQueryBuilder {

  constructor(options) {

    // Set defaults
    this.queryType = "";
    this.query = "";
    this.variables = {};
    this.options = {};

    this.options.apiUri = "https://api.commercetools.com";
    this.options.authUri = "https://auth.commercetools.com";

    if (!options || !(options instanceof Object)) {
      throw ({"error": "No options provided"})
    }

    // Should contain project key, client secret etc
    if (!options["projectKey"] || !options["clientId"] || !options["clientSecret"]) {
      throw ({"error": "Invalid options provided. Should contain projectKey, clientId and clientSecret"})
    }

    this.options = {...this.options, ...options};
  }

  getProductsBySku(skus) {
    this.query = someQuery.query;
    this.addVariable("skus", skus);
    return this;
  }

  addVariable(name, value) {
    this.variables[name] = value;
    return this;
  }

  removeVariable(name) {
    delete this.variables[name];
    return this;
  }

  setQuery(query) {
    this.query = query;
    return this;
  }

  build() {
    return new GraphQLQuery(this);
  }
}

export {GraphQLQuery, GraphQLQueryBuilder} ;
