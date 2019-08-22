# commercetools Product Picker

The commercetools Product Picker is a standalone Javascript component that can be added to third party applications, 
such as Content Management Systems, to allow users to select products and/or categories.

## Example:

TODO

## Running it locally:

```
yarn start
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
