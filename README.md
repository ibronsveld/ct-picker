# commercetools Picker

The commercetools picker (ct-picker) is a standalone Javascript component that can be added to third party applications, 
such as Content Management Systems, to allow users to select products and/or categories from the commercetools platform.

## Supported Features

* Support for products and categories 
* Search using the commercetools free text search
* Support for both Multiple & Single selection modes
* Configurable UI
* Support for multiple display modes
* Pluggable event handling

## Quick Start

### Step 1: Add the reference to the script to your HTML
```html 
<script src="ct-picker.min.js" type="text/javascript"></script>
``` 

### Step 2: Initialize the picker

```javascript
var options = { ... }; 

var ctPicker = new CTPicker(options, containerElementOrContainerElementID);
``` 
For more information on how to provide additional options, check the Configuration Options paragraph.

### Step 3: Display and handle the result
All selections are returned in a custom object. This object will provide the selected item and, when required, the selected variant when the picker is operating in variant mode.

```javascript
ctPicker.show().then((result) => {
  result.forEach((selection) => {
    if (selection.getType() === 'variant') {
      // Handle variant selection
      console.log('Selected Variant ID ' + selection.getVariantId() + ' - ', selection.getItem());
    } else {
      // Selected a product or category
      console.log('Selected ' + selection.getType() + ' - ', selection.getItem());
    }
  })
});
``` 

Note: any selection where variantID equals 1, means the masterVariant is selected. 

## Configuration Options

| Variable | Description | Allowed Values |
|--------|-------------|-------------|
| project | The commercetools project configuration| Object - { "projectKey": "...", "credentials": { "clientId": "...", "clientSecret": "..." } }|
| platform | The commercetools platform configuration | Object - { "apiUri": "...", "authUri": "...", "graphQLUri": "..."}                                                                  
| mode | How to display the picker | String - "_embedded_" to embed in the page, "_dialog_" to generate a dialog (default value) |
| pageSize | Maximum items to load per search | Number - 20 (default value)|
| searchLanguage | Language to use when searching | String - "_en_" (default value)|
| uiLocale | Locale of the UI | String - "_en_" (default value)  |
| currency | Currency to display | String - "_EUR_" (default value)  |
| displayOptions | Additional options around the UI | Object - { showHeader, showCancelButton, showSelectButton } |
| selectionMode | Set selection mode | String - "_single_" (default value) or "_multiple_"
| pickerMode | Set type of objects to pick. | String - "_product_" (default value), "_variant_" for detailed selection of product variants or "_category_"
| handlers | Custom event handlers. | Object - { onSelect: (items), onItemSelected: (item), onItemDeselected: (item), onCancel: () }
                             
For more information on uiLocale, see https://en.wikipedia.org/wiki/IETF_language_tag                              
                                                    
### Configure the display
As part of the options, the UI can be configured to show the header as well as the cancel or select buttons at the bottom.

```json
  {
    "displayOptions": {
      "showHeader": false,
      "showCancelButton": false,
      "showSelectButton": true
    }
  }
```

### Example Configuration
```javascript

  var pickerOptions = {
    config: {
      authUri: 'https://auth.commercetools.com',
      projectKey: '<project>',
      credentials: {
        clientId: '<client>',
        clientSecret: '<secret>'
      },
      apiUri: 'https://api.commercetools.com'
    },
    mode: "embedded",
    pageSize: 20,
    searchLanguage: "en",
    selectionMode: "single",
    pickerMode: "product",
    uiLocale: "en",
    displayOptions: {
      showHeader: false,
      showCancelButton: false,
      showSelectButton: true
    },
    handlers: {
      onSelect: (items) => {
        console.log('selected ', items);
      }, 
      onItemSelected: (items) => {
        console.log('item selected ', items);
      },
      onItemDeselected: (items) => {
        console.log('item deselected ', items);
      },
      onCancel: () => {
        console.log('Cancelled')
      }
    }
  };
```

## Common Examples

### How do I change the display mode?
The picker supports two different display modes: 

#### Displaying a dialog (default)
This option generates the picker UI as a modal dialog.

**Usage:**

```javascript
var options = {
  // mode can be left blank, 'dialog' is the default value
  mode: 'dialog'
}
```

#### Embedding the UI in the page
This option generates the picker UI embedded in the container element, typically used in an iframe.
 
**Usage:**

```javascript
var options = {
  mode: 'embedded'
}
```

### How do I handle user events myself?
In some cases, you might want to handle the user interactions yourself, for example when you disabled the standard buttons in the picker UI.
Handling events can be done by providing the desired event handlers in the options object. 

**Example:**
```javascript

  var options = {    
    handlers: {
      onSelect: (items) => {
        // onSelect is triggered by the main button in the UI
        console.log('User selected these items ', items);
      },
      onItemSelected: (items) => {
        // onItemSelect is triggered by selecting a single product / category in the UI
        console.log('User selected the following item ', items);
      },
      onCancel: () => {
        // onCancel is triggered by cancelling the dialog / UI 
        console.log('Cancelled by user')
      }
    }
  };
``` 



## Running it locally

```
yarn dev
``` 
## Building the script
```
yarn build
``` 

## Full example: Using it in your application

```javascript

  var pickerOptions = {
    config: {
      authUri: 'https://auth.commercetools.com',
      projectKey: '<project>',
      credentials: {
        clientId: '<client>',
        clientSecret: '<secret>'
      },
      apiUri: 'https://api.commercetools.com'
    },
    mode: 'dialog',
    pageSize: 20,
    searchLanguage: "en",
    uiLocale: "en"
  };

  let ctPicker = new CTPicker(pickerOptions, 'container');

  function openPicker() {
    ctPicker.show('dialog').then((data) => {
      console.log(data);
    }).catch((msg) => {
      if (msg === 'cancel') {
        console.log("user cancelled the dialog without selecting any items");
      } else {
        console.error(msg);
      }
    });
  }

```
