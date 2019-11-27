"use strict";

import {createClient} from "@commercetools/sdk-client";
import {createAuthMiddlewareForClientCredentialsFlow} from "@commercetools/sdk-middleware-auth";
import {createHttpMiddleware} from "@commercetools/sdk-middleware-http";
import {createRequestBuilder, features} from "@commercetools/api-request-builder";

class GraphQLQuery {

  constructor(builder) {
    this.queryBody = {
      query: builder.query,
      variables: JSON.stringify(builder.variables)
    }

    this.options = builder.options;
    this._ctpClient = {};

    if (builder.client) {
      this._ctpClient = builder.client;
    } else {
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
            },
            fetch
          }),
          createHttpMiddleware({host: this.options.apiUri, fetch})
        ]
      });
    }

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

  /**
   * Both are optional
   * @param client
   * @param options
   */
  constructor(client, options) {

    // Set defaults
    this.queryType = "";
    this.query = "";
    this.variables = {};
    this.options = {};

    this.options = {...this.options, ...options};

    if (client) {
      this.client = client;
    }
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
