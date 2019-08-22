# commercetools Picker

The commercetools Picker is a standalone Javascript component that can be added to third party applications, 
such as Content Management Systems, to allow users to select products and/or categories from the commercetools platform.

The picker has been designed to be embedded into any webbased UI, including your own custom applications.

## Configuration options

| Option | Description | Allowed Values |
|--------|-------------|-------------|
| config | Object containing the commercetools platform configuration | Object |
| mode | How to display the picker | String - "_embedded_" to embed in the page, "_dialog_" to generate a dialog |
| pageSize | Maximum items to load per search | Number - 20 |
| language | Language to use when searching | String - "en" |
| selectionMode | Toggle selection mode between single and multiple | String - "single" or "multiple"


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
    language: "en",
    selectionMode: "single",
    pickerMode: "product",
    displayOptions: {
      showHeader: false,
      showPaging: false,
      showCancelButton: false,
      showSelectButton: true
    },
    handlers: {
      onSelect: (items) => {
        console.log('selected ', items);
      },
      onCancel: () => {
        console.log('Cancelled')
      }
    }
  };
```

## Running it locally:

```
yarn dev
``` 

## Using it in your application

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
    language: "en",
    facets: {
      color: {
        name: "Color",
        filter: "variants.attributes.color.key",
        limit: 5
      },
      designer: {
        name: "Designer",
        filter: "variants.attributes.designer.key",
        limit: 5
      }
    }
  };

  let ctPicker = new CTPicker(pickerOptions, 'container');
  ctPicker.init();

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
