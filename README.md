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

```javascript
ctPicker.show().then((result) => {
  console.log("User selected the following items ", result);
});
``` 

## Configuration Options

| Variable | Description | Allowed Values |
|--------|-------------|-------------|
| project | The commercetools project configuration| Object - { "projectKey": "...", "credentials": { "clientId": "...", "clientSecret": "..." } }|
| platform | The commercetools platform configuration | Object - { "apiUri": "...", "authUri": "...", "graphQLUri": "..."}                                                                  
| mode | How to display the picker | String - "_embedded_" to embed in the page, "_dialog_" to generate a dialog (default value) |
| pageSize | Maximum items to load per search | Number - 20 (default value)|
| searchLanguage | Language to use when searching | String - "_en_" (default value)|
| uiLocale | Locale of the UI | String - "_en-US_" (default value)  |
| selectionMode | Set selection mode | String - "_single_" (default value) or "_multiple_"
| pickerMode | Set type of objects to pick. | String - "_product_" (default value) or "_category_"
| handlers | Custom event handlers. | Object - { onSelect: (), onItemSelected: (), onItemDeselected: (), onCancel: () }
                                                         

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
    uiLocale: "en-US",
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
    uiLocale: "en-US"
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
