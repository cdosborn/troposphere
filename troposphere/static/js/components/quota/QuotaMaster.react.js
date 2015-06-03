define(function (require) {
  "use strict";

  var React = require('react'),
      Router = require('react-router'),
      stores = require('stores'),
      QuotaRequest = require('./QuotaRequest.react'),
      RouteHandler = Router.RouteHandler;

  return React.createClass({

    mixins: [Router.State],

    render: function () {
      var requests = stores.QuotaRequestStore.findWhere({
            'status.name': 'pending'
          }),
          statuses = stores.QuotaStatusStore.getAll();

      if(!requests || !statuses) return <div className="loading"></div>;

      var quotaRequestRows = requests.map(function(request) {
        return(
          <QuotaRequest key={request.id} request={request} />
        )
      });

      return (
        <div className = "container">
            <h1>Quota Requests</h1>
            <div>
                <table className="quota-table table table-hover col-md-6">
                  <tbody>
                    <tr className="quota-row">
                        <th className="center">
                            <h3>User</h3>
                        </th>
                        <th className="center">
                            <h3>Request</h3>
                        </th>
                        <th className="center">
                            <h3>Description</h3>
                        </th>
                    </tr>
                    {quotaRequestRows}
                    </tbody>
                </table>
              <RouteHandler/>
            </div>
        </div>
      );
    }

  });

});