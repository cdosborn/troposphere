define(function (require) {

  var Dispatcher = require('dispatchers/Dispatcher'),
    BaseStore = require('stores/BaseStore'),
    ImageBookmarkCollection = require('collections/ImageBookmarkCollection'),
    ImageBookmarkConstants = require('constants/ImageBookmarkConstants'),
    ImageCollection = require('collections/ApplicationCollection'),
    stores = require('stores');

  var ImageBookmarkStore = BaseStore.extend({
    collection: ImageBookmarkCollection,

    getBookmarkedImages: function () {
      if (!this.models) return this.fetchModels();
      var haveAllImages = true;

      var images = this.models.map(function (ib) {
        // this will cause the image to be fetched if we don't yet have it
        var image = stores.ApplicationStore.get(ib.get('image').id);
        if (!image) haveAllImages = false;
        return image;
      });

      if (!haveAllImages) return null;

      return new ImageCollection(images);
    }

  });

  var store = new ImageBookmarkStore();

  Dispatcher.register(function (dispatch) {
    var actionType = dispatch.action.actionType;
    var payload = dispatch.action.payload;
    var options = dispatch.action.options || options;

    switch (actionType) {

      case ImageBookmarkConstants.ADD_IMAGE_BOOKMARK:
        store.add(payload.imageBookmark);
        break;

      case ImageBookmarkConstants.REMOVE_IMAGE_BOOKMARK:
        store.remove(payload.imageBookmark);
        break;

      case ImageBookmarkConstants.EMIT_CHANGE:
        break;

      default:
        return true;
    }

    if (!options.silent) {
      store.emitChange();
    }

    return true;
  });

  return store;
});
