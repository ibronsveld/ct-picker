"use strict";

import {createClient} from '@commercetools/sdk-client';
import {createAuthMiddlewareForClientCredentialsFlow} from '@commercetools/sdk-middleware-auth';
import {createRequestBuilder, features} from '@commercetools/api-request-builder';
import {createHttpMiddleware} from "@commercetools/sdk-middleware-http";
import Handlebars from "handlebars";
import {GraphQLQueryBuilder} from "./GraphQLConnector";


/**
 * This class provides access to the commercetools picker
 */
class CTPicker {

  /**
   * Creates an instance of the commercetools picker
   * @param options - options object to configure the picker
   * @param containerElementID - element to use for HTML / templates
   */
  constructor(options, containerElementID) {

    let self = this;

    // Append the HTML from the picker template that is bundled as well
    this.htmlTemplate = require("../picker.html");

    // Load the default options
    let defaultOptions = require('./options.json');
    this.options = { ...defaultOptions, ...options};

    this.options.translations = require('./translations.json');

    //
    //if (this.options.selectedItems)

    // Step 1: Parse the options
    if (this.options.project) {
      // We have a token, otherwise we have to load the login
      this._ctpClient = createClient({
        // The order of the middlewares is important !!!
        middlewares: [
          createAuthMiddlewareForClientCredentialsFlow({
            host: this.options.platform.authUri,
            projectKey: this.options.project.projectKey,
            scopes: ['view_published_products:' + this.options.project.projectKey, 'view_products:' + this.options.project.projectKey ],
            credentials: {
              clientId: this.options.project.credentials.clientId,
              clientSecret: this.options.project.credentials.clientSecret
            }
          }, fetch),
          createHttpMiddleware({host: this.options.platform.graphQLUri}, fetch)
        ]
      });
      this._requestBuilder = createRequestBuilder({
        projectKey: this.options.project.projectKey,
        customServices: {
          graphql: {
            type: 'graphql',
            endpoint: '/graphql',
            features: [features.query]
          }
        }
      });
    } else {
      throw ("Unable to create client: No configuration provided");
    }

    // SETUP HELPERS FOR THE TEMPLATE
    Handlebars.registerHelper('isDialog', (options) => {
      if (self.options.mode === 'dialog') {
        if (options.fn)
          return options.fn(this);
      }
      if (options.inverse)
        return options.inverse(this);
    });

    Handlebars.registerHelper('getLabel', (key, options) => {
      return self._getLabel(key);
    });

    Handlebars.registerHelper('mcLink', (id, options) => {
      if (id) {
        let uriTemplate = `${self.options.platform.mcUri}/${self.options.project.projectKey}/products/${id}/general`;
        if (self.options.pickerMode === 'category') {
          uriTemplate = `${self.options.platform.mcUri}/${self.options.project.projectKey}/categories/${id}/general`;
        }

        return uriTemplate
      }
    });

    Handlebars.registerHelper('formatPrice', (prices, index, currency, options) => {

      index = index || 0;
      currency = currency || "EUR";

      if (prices) {
        let priceObject = prices[index];
        if (priceObject) {
          if (priceObject.value) {
            if (priceObject.value.currencyCode === currency) {
              // Calc value
              let factor = Math.pow(10, parseInt(priceObject.value.fractionDigits));
              let amount = priceObject.value.centAmount;
              let total = amount/factor;
              return total.toLocaleString(self.options.uiLocale, {currency:priceObject.value.currencyCode, style:"currency"});
            }
          }
        }
      } else {

      }
    });

    // HELPER FUNCTION TO SELECT ITEM IF THE ID WAS ALREADY SELECTED
    // NOTE: CURRENTLY ONLY WORKS WHEN YOU USE A QUERY
    Handlebars.registerHelper("shouldSelect", function(id, options) {
      if (id) {
        if (self.options.selectedItems) {
          if (self.options.selectedItems.indexOf(id) > -1) {
            return "data-selected=\"true\"";
          }
        }
      }

      return "";
    });


    Handlebars.registerHelper("ifValue", function(conditional, options) {
      if (conditional == options.hash.equals) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // SETUP CONTAINER ELEMENT
    try {
      if (typeof containerElementID === 'string' || containerElementID instanceof String) {
        this.containerElement = document.getElementById(containerElementID);
      } else {
        this.containerElement = containerElementID;
      }
    } catch (err) {
      console.error("Error selecting container element", err);
    }
  }

  /**
   * Shows the picker
   * @returns {Promise<any>} Promise that resolves with the selected items.
   */
  show() {
    let self = this;

    let promise = new Promise((resolve, reject) => {
      self.resolveFn = resolve;
      self.rejectFn = reject;
    });

    // First, add the HTML to the container element
    if (self.containerElement) {
      self.containerElement.innerHTML = self.htmlTemplate;

      // Second, process the appropriate elements after giving it a small delay
      setTimeout(() => {
        try {
          let script = self._getTemplate('ctp-picker-template');

          let finalHTML = script(self.options);

          let wrapper = document.createElement('div');
          wrapper.id = "ctp-wrapper";
          wrapper.innerHTML = finalHTML;

          self.containerElement.appendChild(wrapper);

          // There are several elements in the wrapper that need an event handler
          // We loop through all the elements that are in there and attach the appropriate handler
          let elements = self.containerElement.querySelectorAll('a[data-event]');

          // We found some buttons, attach the handler
          if (elements) {
            elements.forEach((button) => {
              button.onclick = (e) => {
                // Based on the event target
                if (e) {
                  if (e.target) {
                    let attr = e.target.getAttribute("data-event");
                    if (attr) {

                      switch (attr) {
                        case "search":
                          self._doSearch();
                          break;

                        case "select":
                          self._doSelect();
                          break;

                        case "cancel":
                          self._doCancel();
                          break;
                      }
                    }
                  }
                }
              }
            });
          }

          let input = document.getElementById("ctp-search-input");

          if (input) {
            input.addEventListener("keyup", function (event) {
              // Number 13 is the "Enter" key on the keyboard
              if (event.keyCode === 13) {
                // Cancel the default action, if needed
                event.preventDefault();
                // Trigger the button element with a click
                self._doSearch();
              }

              if (event.keyCode === 27) {
                event.preventDefault();
                self._doCancel();
              }
            });
            input.focus();
          }

        } catch (err) {
          console.error("Error creating dialog!", err);
        }

        // The toggle method knows if we are dialog or not, always use toggle
        self._toggle();

      }, 200);
    }
    return promise;
  }

  /**
   * Returns the selected items
   * @returns {Promise<any>} Promise that, when resolved, returns the selected items
   */
  getSelectedItems() {
    let self = this;

    // Loop over all
    // TODO: Change parent?

    return new Promise((resolve, reject) => {
      let elements = self.containerElement.querySelectorAll('div[data-role="action"]');

      if (elements) {
        let selected = [];
        elements.forEach((elem) => {
          if (elem.hasAttribute("data-selected")) {
            let id = elem.getAttribute('data-id');
            selected.push(self._findById(id).then((item) => {
              return item;
            }));
          }
        });

        Promise.all(selected).then((data) => {
          resolve(data);
        })
      }
    });
  }

  /**
   * Loads a template by ID
   * @param id The ID of the element to get the template from
   * @returns {HandlebarsTemplateDelegate<any>}
   * @private
   */
  _getTemplate(id) {
    let elem = document.getElementById(id);
    if (elem) {
      let tmpl = elem.innerHTML;
      return Handlebars.compile(tmpl);
    } else {
      throw "Template " + id + " not found";
    }
  }

  _getLabel(key) {
    let self = this;
    if (self.options.uiLocale) {
      let labels = self.options.translations[self.options.uiLocale];
      if (labels) {
        if (labels[key]) {
          return labels[key];
        }
      }
    }
  }

  _format() {
    let args = arguments;

    return args[0].replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  }

  /**
   * Clears the current product grid
   * @private
   */
  _clearResults() {
    let docList = document.getElementById("ctp-list");
    while (docList.firstChild) {
      docList.removeChild(docList.firstChild);
    }
  }

  /**
   * Toggle the Dialog
   * @private
   */
  _toggle() {

    // If the mode is not "dialog" return
    let self = this;

    if (self.options.mode === 'dialog') {
      // When the user clicks anywhere outside of the modal, close it
      let modal = document.getElementById("ctp-popup");
      if (modal) {
        let open = modal.getAttribute("open");
        if (!open) {
          modal.setAttribute("open", "true");
          let input = document.getElementById("ctp-search-input");
          input.focus();
        } else {
          modal.removeAttribute("open");
        }

        // modal.showDialog();

      } else {
        throw ("No dialog found");
      }
    } else {
      return;
    }
  }

  /**
   * Finds the object in the current search data
   * @param id
   * @returns {Promise<any>}
   * @private
   */
  _findById(id) {
    return new Promise((resolve, reject) => {
      let self = this;

      if (self.context && self.context.results) {
        // Let's find the right element
        self.context.results.forEach((item) => {
          if (item["id"] === id) {
            resolve(item);
          }
        });
      } else {
        reject("no data");
      }
    });
  }

  /**
   * Handle the select event
   * @private
   */
  _doSelect() {
    let self = this;
    self._toggle();

    self.getSelectedItems().then((data) => {

      if (self.options.handlers && self.options.handlers.onSelect) {
        self.options.handlers.onSelect(data);
      }

      if (self.resolveFn) {
        self.resolveFn(data);
      } else {
        throw "Error resolving / rejecting the promise.";
      }
    })
  }

  /**
   * Handle the cancel event
   * @private
   */
  _doCancel() {
    let self = this;
    self._toggle();

    if (self.options.handlers && self.options.handlers.onCancel) {
      self.options.handlers.onCancel();
    }

    if (self.rejectFn) {
      self.rejectFn("cancel");
    } else {
      throw "Error resolving / rejecting the promise.";
    }
  }

  /**
   * Execute request in the platform
   * @param request
   * @returns {Promise<T | never>}
   * @private
   */
  _doRequest(request) {
    let self = this;
    try {
      if (self._ctpClient && request) {
        return self._ctpClient.execute(request).then((response) => {
          return response;
        }).catch((error) => {
          throw error;
        })
      } else {
        throw ("Client not initialized");
      }
    } catch (e) {
      if (self.rejectFn) {
        self.rejectFn(e);
      } else {
        throw e;
      }
    }
  }

  /**
   * Executes a search in the platform
   * @private
   */
  _doSearch() {
    let self = this;
    switch (self.options.pickerMode) {
      case 'category':
        self._doCategorySearch();
        break;

      default:
        self._doProductSearch();
        break;
    }
  }

  /**
   * Search for products
   * @private
   */
  _doProductSearch() {
    let self = this;
    if (self._requestBuilder) {
      // Loop through all the controls
      let freetextSearch = document.getElementById("ctp-search-input").value;

      let productQuery = self._requestBuilder.productProjectionsSearch;
      // First we set the basic settings
      // v1.0: There is no UI for facets
      if (self.options.facets) {
        let facetKeys = Object.keys(self.options.facets);
        facetKeys.forEach((key) => {
          let item = self.options.facets[key];
          productQuery.facet(item.filter + " as " + key);
        });
      }

      // Add the other options
      productQuery.text(freetextSearch, ((self.options.searchLanguage) ? self.options.searchLanguage : "en"));
      productQuery.perPage((self.options.pageSize) ? self.options.pageSize : 20);

      let productRequest = {
        uri: productQuery.build(),
        method: 'GET'
      };

      // Do a search
      self._doRequest(productRequest).then((response) => {
        if (response.body && response.body.results) {
          self._updateTemplateContext(response.body.results, response.body.facets);
          self._printResults();
        }
      });
    }
  }

  /**
   * Search for categories
   * @private
   */
  _doCategorySearch() {
    let self = this;
    if (self._requestBuilder) {

      // Loop through all the controls
      let freetextSearch = document.getElementById("ctp-search-input").value;

      // Build a GraphQL query
      let builder = new GraphQLQueryBuilder(self._ctpClient, {projectKey: self.options.project.projectKey});
      let query = builder.setQuery('query category($searchTerm: String!, $locale: Locale!) {\n' +
        '  categorySearch(fulltext: {text: $searchTerm, locale: $locale}) {\n' +
        '    results {\n' +
        '      id,\n' +
        '      key,\n' +
        '      name(locale: $locale),\n' +
        '      slug(locale: $locale),\n' +
        '      stagedProductCount,\n' +
        '      ancestors {\n' +
        '        name(locale:$locale)\n' +
        '      }\n' +
        '    }\n' +
        '  }\n' +
        '}').addVariable("searchTerm", freetextSearch)
        .addVariable("locale", self.options.searchLanguage).build();

      // Do a search
      query.execute().then((response) => {
        console.log(response);
        if (response.body && response.body.data && response.body.data.categorySearch && response.body.data.categorySearch.results) {
          self._updateTemplateContext(response.body.data.categorySearch.results, response.body.facets);
          self._printResults();
        }
      });
    }
  }

  /**
   * Display the results
   * @private
   */
  _printResults() {
    //
    let self = this;
    self._clearResults();

    // HANDLE PRODUCTS
    let itemTemplate = self._getTemplate("ctp-product-item");

    if (self.options.pickerMode === 'category') {
      itemTemplate = self._getTemplate("ctp-category-item");
    }

    let itemsHTML = itemTemplate(self.context);

    // Set the status text
    let statusText = document.getElementById('ctp-status-text');
    statusText.innerText = self._format(self._getLabel('resultsFoundText'), self.context.results.length);

    // Use handlebars to generate the HTML
    let list = document.getElementById('ctp-list');
    list.innerHTML = itemsHTML;

    // Now, let's add the appropriate clicks to the UI
    let buttons = list.querySelectorAll('div[data-role="action"]');
    buttons.forEach((b) => {
      b.addEventListener('click', (e) => {

        // Find main
        let button = b;

        if (button.hasAttribute("data-id")) {
          let selected = false;
          // Toggle the selected
          if (button.hasAttribute("data-selected")) {
            if (self.options.selectionMode === 'single') {
              self._unselectAll();
            } else {
              button.removeAttribute("data-selected");
            }
          } else {
            if (self.options.selectionMode === 'single') {
              self._unselectAll();
            }
            selected = true;
            button.setAttribute("data-selected", "true");
          }

          self._findById(button.getAttribute("data-id")).then((selectedObject) => {
            if (selected) {
              if (self.options.handlers && self.options.handlers.onItemSelected) {
                self.options.handlers.onItemSelected(selectedObject);
              }
            } else {
              if (self.options.handlers && self.options.handlers.onItemDeselected) {
                self.options.handlers.onItemDeselected(selectedObject);
              }
            }
          });
        }
      })
    });
  }

  /**
   * Remove selection
   * @private
   */
  _unselectAll() {
    let list = document.getElementById('ctp-list');
    let buttons = list.querySelectorAll('div[data-selected="true"]');
    buttons.forEach((b) => {
      b.removeAttribute("data-selected");
    });
  }

  /**
   * Store the right information in the context for generating the templates
   * @param products products
   * @param facets facets
   * @private
   */
  _updateTemplateContext(products, facets) {
    let self = this;

    self.context = {
      facets: [],
      results: []
    };


    if (facets) {
      let facetKeys = Object.keys(facets);
      if (facetKeys) {

        facetKeys.forEach((key) => {
          let option = {};

          // We need to check the options
          if (self.options.facets) {
            if (self.options.facets[key]) {
              option = self.options.facets[key]
            }
          }

          let facetObject = {
            name: option.name,
            terms: [],
            limit: option.limit
          };

          // Return an array with the terms
          facets[key].terms.forEach((i) => {
            facetObject.terms.push(i);
          });
          self.context.facets.push(facetObject);
        });
      }
    }

    if (products) {
      self.context.results = products;
    }
  }
}

// TODO: Build a builder??
class CTPickerBuilder {

}

// TODO: proper expose?
//export default CTPicker;
window.CTPicker = CTPicker;




