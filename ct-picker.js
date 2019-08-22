"use strict";
require('buffer');
var createClient = require('@commercetools/sdk-client').createClient;
var createAuthMiddlewareForClientCredentialsFlow = require('@commercetools/sdk-middleware-auth').createAuthMiddlewareForClientCredentialsFlow;
var requestBuilder = require('@commercetools/api-request-builder').createRequestBuilder({projectKey: 'ivos-personal-project'});
var createHttpMiddleware = require('@commercetools/sdk-middleware-http').createHttpMiddleware;

const modalUI = `
    <style>
      /* The Modal (background) */
      .modal {
        display: none; /* Hidden by default */
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0,0,0); /* Fallback color */
        background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
      }
      
      /* Modal Content/Box */
      .modal-content {
        background-color: #fefefe;
        margin: 15% auto; /* 15% from the top and centered */
        padding: 20px;
        border: 1px solid #888;
        width: 80%; /* Could be more or less, depending on screen size */
      }
      
      /* The Close Button */
      .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
      }
      
      .close:hover,
      .close:focus {
        color: black;
        text-decoration: none;
        cursor: pointer;
      }
    </style>
    
    <div id="ctPickerDialog" class="modal">
      <!-- Modal content -->
      <div class="modal-content">
        <span class="close">&times;</span>
        <div id="loginContainer">
            <form>
                <h2>Sign in</h2>
            </form>
        </div>
        <div id="pickerContainer">
            <h2>Pick</h2>
        </div>
        <!--<iframe src="picker.html" style="width:100%;height:750px"></iframe>-->
        <div>
            <button>PICK</button>
        </div>
      </div>      
    </div>    
`;

window.CTPicker = function (options, containerElementID) {

  this.options = options;

  // Step 1: Parse the options
  if (this.options) {
    // Set
    if (this.options.token) {
      // We have a token, otherwise we have to load the login
      this.authenticated = true;
    } else {
      this.authenticated = false;
    }

    // try{
    //   // var btn = document.getElementById("myBtn");
    //   // // When the user clicks on the button, open the modal
    //   // btn.onclick = function () {
    //   //   modal.style.display = "block";
    //   // }
    //
    // } catch (err) {
    //   console.error("Error selecting container element", err);
    // }
  }

  try {
    this.containerElement = document.getElementById(containerElementID);

  } catch (err) {
    console.error("Error selecting container element", err);
  }

  // Step 2:
}

CTPicker.prototype.open = function () {
  //alert('open');
  if (this.containerElement) {
    this.containerElement.innerHTML = modalUI;

    // Get the modal
    var modal = document.getElementById("ctPickerDialog");
    modal.style.display = "block";

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
      modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };

    var productQuery = requestBuilder.products.build();
    var productRequest = {
      uri: productQuery,
      method: 'GET'
    };

    const client = createClient({
      // The order of the middlewares is important !!!
      middlewares: [
        createAuthMiddlewareForClientCredentialsFlow({
          host: 'https://auth.commercetools.com',
          projectKey: 'ivos-personal-project',
          credentials: {
            clientId: 'GVijKg5WUzUjZwO8v2FJNv_i',
            clientSecret: 'MoVEzWL2uAEj9Y0Zoy1F9dTIBPkXDUlk'
          }
        }, fetch),
        createHttpMiddleware({host: 'https://api.commercetools.com'}, fetch)
      ]
    });

    client.execute(productRequest).then((response) => {
      //console.log('ds');
      console.log(response);
    });

    //var client = CommercetoolsSdkClient.createClient()
    // // Check the state
    // if (this.authenticated) {
    //   document.getElementById("loginContainer").style.display = "none";
    //   document.getElementById("pickerContainer").style.display = "block";
    // } else {
    //   document.getElementById("pickerContainer").style.display = "none";
    //   document.getElementById("loginContainer").style.display = "block";
    // }
  }
}




