"use strict";

import {createClient} from '@commercetools/sdk-client';
import {createAuthMiddlewareForClientCredentialsFlow} from '@commercetools/sdk-middleware-auth';
import {createRequestBuilder, features} from '@commercetools/api-request-builder';
import {createHttpMiddleware} from "@commercetools/sdk-middleware-http";
import {compile} from "handlebars";

/**
 * This class provides access to the commercetools picker
 */
class CTPicker {

  constructor(options, containerElementID) {

    this.options = options;

    // Step 1: Parse the options
    if (this.options) {
      // Set
      if (this.options.config) {
        // We have a token, otherwise we have to load the login
        this._ctpClient = createClient({
          // The order of the middlewares is important !!!
          middlewares: [
            createAuthMiddlewareForClientCredentialsFlow({
              host: this.options.config.authUri,
              projectKey: this.options.config.projectKey,
              credentials: {
                clientId: this.options.config.credentials.clientId,
                clientSecret: this.options.config.credentials.clientSecret
              }
            }, fetch),
            createHttpMiddleware({host: this.options.config.apiUri}, fetch)
          ]
        });
        this._requestBuilder = createRequestBuilder({projectKey: this.options.config.projectKey});
      } else {
        throw ("Unable to create client: No configuration provided");
      }

      // Set the operating mode
      if (!this.options.mode) {
        this.options.mode = 'dialog';
      }

      // Do some other checks

    }

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

  init() {
    let self = this;

    return new Promise((resolve, reject) => {
      if (self.options.selected) {
        // TODO: Handle this properly
        // This is when mode = 'hybrid'
      }

      // Add the contents to the element
      if (self.containerElement) {
        let url = "https://ct-merchant-test.herokuapp.com/picker.html";
        // Load the template from the URL
        // TODO: How do we handle this in production?
        //url = "picker.html";
        fetch(url).then((response) => {
          response.text().then((modalUIData) => {
            // Adds the HTML scripts to the page for use with Handlebars
            self.containerElement.innerHTML = modalUIData;
            self.UIgenerated = false;
            resolve(true);
          })
        }).catch((err) => {
          reject(err);
        });
      }
    });
  }

  /**
   * Shows the picker
   * @param mode - one of the following: 'dialog', 'embedded'
   * @returns {Promise<any>}
   */
  show(mode) {
    let self = this;

    let promise = new Promise((resolve, reject) => {
      self.resolveFn = resolve;
      self.rejectFn = reject;
    });

    // UI has not been generated yet, so ensure we generate the HTML and attach the correct handlers to the buttons
    if (!self.UIgenerated) {

      switch (mode || self.options.mode) {
        case 'embedded':
          self._generateEmbedded();
          break;
        case 'dialog':
          self._generateDialog();
          break;
      }

      // TODO REFACTOR
      setTimeout(() => {
        try {

          // Add
          if (self.options.displayOptions) {
            if (self.options.displayOptions.showSelectButton) {
              let saveButton = document.getElementById("ct_saveButton");
              // Hide the OK button when nothing selected
              // saveButton.style.display = "none";

              if (self.options.handlers && self.options.handlers.onSelect) {
                saveButton.onclick = () => {

                  switch (mode || self.options.mode) {
                    case 'dialog':
                      self._toggle();
                      break;
                  }
                  self._getSelectedItems().then((data) => {
                    self.options.handlers.onSelect(data);
                  })
                }
              } else {
                saveButton.onclick = () => {

                  switch (mode || self.options.mode) {
                    case 'dialog':
                      self._toggle();
                      break;
                  }

                  if (self.resolveFn) {
                    self._getSelectedItems().then((data) => {
                      self.resolveFn(data);
                    })
                  } else {
                    throw "Error resolving / rejecting the promise.";
                  }
                };
              }
            }

            // TODO: Add event handlers
            if (self.options.displayOptions.showCancelButton) {
              let cancelButton = document.getElementById("ct_cancelButton");

              if (self.options.handlers && self.options.handlers.onCancel) {
                cancelButton.onclick = () => {

                  switch (mode || self.options.mode) {
                    case 'dialog':
                      self._toggle();
                      break;
                  }

                  self.options.handlers.onCancel();
                }
              } else {
                cancelButton.onclick = () => {

                  switch (mode || self.options.mode) {
                    case 'dialog':
                      self._toggle();
                      break;
                  }

                  if (self.rejectFn) {
                    self.rejectFn("cancel");
                  } else {
                    throw "Error resolving / rejecting the promise.";
                  }
                };
              }
            }
          }
          // TODO: Add the basic text search option
          let input = document.getElementById("searchTerm");
          input.addEventListener("keyup", function (event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
              // Cancel the default action, if needed
              event.preventDefault();
              // Trigger the button element with a click
              document.getElementById("ct_searchButton").click();
            }

            if (event.keyCode === 27) {
              event.preventDefault();
              document.getElementById("ct_cancelButton").click();
            }
          });

          let searchButton = document.getElementById("ct_searchButton");
          searchButton.onclick = () => {
            self._doSearch();
          };
        } catch (err) {
          console.error("Error creating dialog!", err);
        }
      }, 500);

      self.UIgenerated = true;
    }

    switch (mode || self.options.mode) {
      case 'dialog':
        self._toggle();
        break;
    }


    return promise;
  }

  // /**
  //  * Shows the picker in a different mode
  //  * @returns {Promise<any>}
  //  */
  // show() {
  //   let self = this;
  //
  //   if (self.options && self.options.mode !== 'embedded') {
  //     throw "mode not set to embedded";
  //   }
  //
  //   // Based on the mode, do different things
  //
  //
  //   let promise = new Promise((resolve, reject) => {
  //     self.resolveFn = resolve;
  //     self.rejectFn = reject;
  //   });
  //
  //
  //   self._generateEmbedded();
  //
  //   // self._toggle();
  //   return promise;
  // }


  // /**
  //  * Shows the picker as a modal dialog. Requires mode = 'dialog'
  //  * @param resetState set to true to reset the state to default, false to keep the current state
  //  * @returns {Promise<any>} promise to resolve result of the dialog
  //  */
  // showModal(resetState) {
  //   let self = this;
  //
  //   if (resetState) {
  //     // We remove the elements
  //     self.selected = [];
  //     //self._updateTemplateContext(undefined, undefined);
  //     self._clearResults();
  //   }
  //
  //   let promise = new Promise((resolve, reject) => {
  //     self.resolveFn = resolve;
  //     self.rejectFn = reject;
  //   });
  //
  //   self._toggle();
  //   return promise;
  // }

  // select(id) {
  //   // Check if we have it in the list
  //   let self = this;
  //
  //   if (!self.selected) {
  //     self.selected = [];
  //   }
  //
  //   if (self.selected) {
  //     let idx = self.selected.indexOf(id);
  //     if (idx > -1) {
  //       self.selected.splice(idx, 1);
  //     } else {
  //       self.selected.push(id);
  //     }
  //   }
  //
  //   if (self.selected.length > 0) {
  //     let saveButton = document.getElementById("ct_saveButton");
  //     saveButton.style.display = "unset";
  //   }
  // }

  /**
   * Generates the dialog and adds the appropriate click handlers
   * @private
   */
  _generateDialog() {

    let self = this;

    let dialogWrapper = document.getElementById("ct_PickerDialogWrapper");
    if (!dialogWrapper) {

      let dialog = self._getTemplate('ct_PickerDialogTemplate');

      // TODO: ADD TRANSLATIONS HERE
      let finalHTML = dialog(self.options);
      let wrapper = document.createElement('div');
      wrapper.id = "ct_PickerDialogWrapper";
      wrapper.innerHTML = finalHTML;
      self.containerElement.appendChild(wrapper);
    }
  }

  /**
   * Generates the dialog and adds the appropriate click handlers
   * @private
   */
  _generateEmbedded() {

    let self = this;

    let dialog = self._getTemplate('ct_PickerTemplate');

    // TODO: ADD TRANSLATIONS HERE
    let finalHTML = dialog(self.options);
    let wrapper = document.createElement('div');
    wrapper.id = "ct_PickerWrapper";
    wrapper.innerHTML = finalHTML;
    self.containerElement.appendChild(wrapper);
  }

  /**
   * Returns the selected items
   * @returns {Promise<any>} Promise that, when resolved, returns the selected items
   * @private
   */
  _getSelectedItems() {
    let self = this;

    // Loop over all
    // TODO: Change parent

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

    let tmpl = document.getElementById(id).innerHTML;
    return compile(tmpl);
  }

  /**
   * Clears the current product grid
   * @private
   */
  _clearResults() {
    let docList = document.getElementById("productListContainer");
    while (docList.firstChild) {
      docList.removeChild(docList.firstChild);
    }
  }

  /**
   * Toggle the Dialog
   * @private
   */
  _toggle() {

    // When the user clicks anywhere outside of the modal, close it
    let modal = document.getElementById("popup");
    let open = modal.getAttribute("open");
    if (!open) {
      modal.setAttribute("open", "true");
      let input = document.getElementById("searchTerm");
      input.focus();
    } else {
      modal.removeAttribute("open");
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

  _doProductSearch() {
    let self = this;
    if (self._requestBuilder) {

      //let productQuery = self._requestBuilder.productProjectionsSearch.text("bag", "en").build(); //= features.search;  //= {value: 'bag', language: 'en'} //self._requestBuilder.products.build();

      // TODO: Select Categories as well??

      // TODO: Create the facet & filter state


      // Loop through all the controls
      let freetextSearch = document.getElementById("searchTerm").value;

      let productQuery = self._requestBuilder.productProjectionsSearch;
      // First we set the basic settings
      if (self.options.facets) {
        let facetKeys = Object.keys(self.options.facets);
        facetKeys.forEach((key) => {
          let item = self.options.facets[key];
          productQuery.facet(item.filter + " as " + key);
        });
      }

      // Add the other options
      productQuery.text(freetextSearch, ((self.options.language) ? self.options.language : "en"));
      productQuery.perPage((self.options.pageSize) ? self.options.pageSize : 20);

      let productRequest = {
        uri: productQuery.build(),
        method: 'GET'
      };

      // Do a search
      self._doRequest(productRequest).then((response) => {
        if (response.body && response.body.results) {
          self._updateTemplateContext(response.body.results, response.body.facets);
          // console.log(response.body.results);
          self._printResults();
        }
      });
    }
  }

  _doCategorySearch() {
    let self = this;
    if (self._requestBuilder) {

      //let productQuery = self._requestBuilder.productProjectionsSearch.text("bag", "en").build(); //= features.search;  //= {value: 'bag', language: 'en'} //self._requestBuilder.products.build();

      // TODO: Select Categories as well??

      // TODO: Create the facet & filter state


      // Loop through all the controls
      let freetextSearch = document.getElementById("searchTerm").value;

      let productQuery = self._requestBuilder.categories;
      // First we set the basic settings
      // if (self.options.facets) {
      //   let facetKeys = Object.keys(self.options.facets);
      //   facetKeys.forEach((key) => {
      //     let item = self.options.facets[key];
      //     productQuery.facet(item.filter + " as " + key);
      //   });
      // }

      // Add the other options
      // productQuery.where(freetextSearch, ((self.options.language) ? self.options.language : "en"));
      productQuery.perPage((self.options.pageSize) ? self.options.pageSize : 20);

      let productRequest = {
        uri: productQuery.build(),
        method: 'GET'
      };

      console.log(productRequest.uri);

      // Do a search
      self._doRequest(productRequest).then((response) => {
        if (response.body && response.body.results) {
          self._updateTemplateContext(response.body.results, response.body.facets);
          // console.log(response.body.results);
          self._printResults();
        }
      });
    }
  }

  _printResults() {
    //
    let self = this;
    self._clearResults();

    // HANDLE PRODUCTS

    let productTemplate = self._getTemplate("productItem");
    let productHTML = productTemplate(self.context);

    // Use handlebars to generate the HTML
    let list = document.getElementById('productListContainer');
    list.innerHTML = productHTML;

    // Now, let's add the appropriate clicks to the UI
    let buttons = list.querySelectorAll('div[data-role="action"]');
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        if (b.hasAttribute("data-id")) {

          // Toggle the selected
          if (b.hasAttribute("data-selected")) {
            b.removeAttribute("data-selected");
          } else {
            b.setAttribute("data-selected", "true");
          }
        }
      })
    });

    // HANDLE FACETS, IF APPLICABLE
    let filterList = document.getElementById("filterPanel");
    let facetTemplate = self._getTemplate("ct_FacetTemplate");

    let facetHTML = facetTemplate(self.context);
    filterList.innerHTML = facetHTML;
  }

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
}

// TODO: proper expose?
window.CTPicker = CTPicker;




