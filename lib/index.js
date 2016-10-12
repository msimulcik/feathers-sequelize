'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = init;

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _feathersQueryFilters = require('feathers-query-filters');

var _feathersQueryFilters2 = _interopRequireDefault(_feathersQueryFilters);

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Service = function () {
  function Service(options) {
    _classCallCheck(this, Service);

    if (!options) {
      throw new Error('Sequelize options have to be provided');
    }

    if (!options.Model) {
      throw new Error('You must provide a Sequelize Model');
    }

    this.paginate = options.paginate || {};
    this.Model = options.Model;
    this.id = options.id || 'id';
    this.events = options.events;
  }

  _createClass(Service, [{
    key: 'extend',
    value: function extend(obj) {
      return _uberproto2.default.extend(obj, this);
    }
  }, {
    key: '_find',
    value: function _find(params) {
      var getFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _feathersQueryFilters2.default;

      var _getFilter = getFilter(params.query || {});

      var filters = _getFilter.filters;
      var query = _getFilter.query;

      var where = utils.getWhere(query);
      var order = utils.getOrder(filters.$sort);

      var q = _extends({
        where: where, order: order,
        limit: filters.$limit,
        offset: filters.$skip
      }, params.sequelize);

      if (filters.$select) {
        q.attributes = filters.$select;
      }

      return this.Model.findAndCount(q).then(function (result) {
        return {
          total: result.count,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: result.rows
        };
      }).catch(utils.errorHandler);
    }
  }, {
    key: 'find',
    value: function find(params) {
      var paginate = params && typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
      var result = this._find(params, function (where) {
        return (0, _feathersQueryFilters2.default)(where, paginate);
      });

      if (!paginate.default) {
        return result.then(function (page) {
          return page.data;
        });
      }

      return result;
    }
  }, {
    key: '_get',
    value: function _get(id, params) {
      return this.Model.findById(id, params.sequelize).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        return instance;
      }).catch(utils.errorHandler);
    }

    // returns either the model intance for an id or all unpaginated
    // items for `params` if id is null

  }, {
    key: '_getOrFind',
    value: function _getOrFind(id, params) {
      if (id === null) {
        return this._find(params).then(function (page) {
          return page.data;
        });
      }

      return this._get(id, params);
    }
  }, {
    key: 'get',
    value: function get(id, params) {
      return this._get(id, params);
    }
  }, {
    key: 'create',
    value: function create(data, params) {
      var options = params.sequelize || {};

      if (Array.isArray(data)) {
        return this.Model.bulkCreate(data, options).catch(utils.errorHandler);
      }

      return this.Model.create(data, options).catch(utils.errorHandler);
    }
  }, {
    key: 'patch',
    value: function patch(id, data, params) {
      var _this = this;

      var where = _extends({}, params.query);
      var patchQuery = {};

      // Account for potentially modified data
      Object.keys(where).forEach(function (key) {
        if (where[key] !== undefined && data[key] !== undefined && _typeof(data[key]) !== 'object') {
          patchQuery[key] = data[key];
        } else {
          patchQuery[key] = where[key];
        }
      });

      var patchParams = _extends({}, params, {
        query: patchQuery
      });

      if (id !== null) {
        where[this.id] = id;
      }

      var options = _extends({}, params.sequelize, { where: where });

      return this.Model.update((0, _lodash2.default)(data, this.id), options).then(function () {
        return _this._getOrFind(id, patchParams);
      }).catch(utils.errorHandler);
    }
  }, {
    key: 'update',
    value: function update(id, data, params) {
      var options = _extends({}, params.sequelize);

      if (Array.isArray(data)) {
        return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
      }

      return this.Model.findById(id).then(function (instance) {
        if (!instance) {
          throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
        }

        var copy = {};
        Object.keys(instance.toJSON()).forEach(function (key) {
          if (typeof data[key] === 'undefined') {
            copy[key] = null;
          } else {
            copy[key] = data[key];
          }
        });

        return instance.update(copy, options);
      }).catch(utils.errorHandler);
    }
  }, {
    key: 'remove',
    value: function remove(id, params) {
      var _this2 = this;

      return this._getOrFind(id, params).then(function (data) {
        var where = _extends({}, params.query);

        if (id !== null) {
          where[_this2.id] = id;
        }

        var options = _extends({}, params.sequelize, { where: where });

        return _this2.Model.destroy(options).then(function () {
          return data;
        });
      }).catch(utils.errorHandler);
    }
  }]);

  return Service;
}();

function init(Model) {
  return new Service(Model);
}

init.Service = Service;
module.exports = exports['default'];