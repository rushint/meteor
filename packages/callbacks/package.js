Package.describe({
  summary: "callbacks for mongo actions"
});

Package.on_use(function (api) {
  api.use('underscore', 'server');

  api.add_files('remote_collection_driver_with_callbacks.js', ['server']);
});

Package.on_test(function (api) {

});
