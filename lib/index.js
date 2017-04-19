'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

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

var _feathersCommons = require('feathers-commons');

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

      var _getFilter = getFilter(params.query || {}),
          filters = _getFilter.filters,
          query = _getFilter.query;

      filters.$$includeCount = query.$$includeCount;
      query = (0, _lodash2.default)(query, ['$$includeCount']);

      var where = utils.getWhere(query);
      var order = utils.getOrder(filters.$sort);

      var q = _extends({
        where: where,
        order: order,
        limit: filters.$limit,
        offset: filters.$skip
      }, params.sequelize);

      if (filters.$select) {
        q.attributes = filters.$select;
      }

      if (filters.$$includeCount) {
        return this.Model.findAndCount(q).then(function (result) {
          return {
            total: result.count,
            limit: filters.$limit,
            skip: filters.$skip || 0,
            data: result.rows
          };
        }).catch(utils.errorHandler);
      }

      return this.Model.findAll(q).then(function (result) {
        return {
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: result
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
      var promise = void 0;

      if (params.sequelize && params.sequelize.include) {
        // If eager-loading is used, we need to use the find method
        var where = utils.getWhere(params.query);

        // Attach 'where' constraints, if any were used.
        var q = _extends({ where: _extends({ id: id }, where) }, params.sequelize);

        promise = this.Model.findAll(q).then(function (result) {
          if (result.length === 0) {
            throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
          }

          return result[0];
        });
      } else {
        promise = this.Model.findById(id, params.sequelize).then(function (instance) {
          if (!instance) {
            throw new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\'');
          }

          return instance;
        });
      }

      return promise.then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
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
      return this._get(id, params).then((0, _feathersCommons.select)(params, this.id));
    }
  }, {
    key: 'create',
    value: function create(data, params) {
      var options = params.sequelize || {};

      if (Array.isArray(data)) {
        return this.Model.bulkCreate(data, options).catch(utils.errorHandler);
      }

      return this.Model.create(data, options).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'patch',
    value: function patch(id, data, params) {
      var _this = this;

      var where = _extends({}, (0, _feathersQueryFilters2.default)(params.query || {}).query);
      var mapIds = function mapIds(page) {
        return page.data.map(function (current) {
          return current[_this.id];
        });
      };

      if (id !== null) {
        where[this.id] = id;
      }

      var options = _extends({}, params.sequelize, { where: where });

      // This is the best way to implement patch in sql, the other dialects 'should' use a transaction.
      if (this.Model.sequelize.options.dialect === 'postgres') {
        options.returning = true;
        return this.Model.update((0, _lodash2.default)(data, this.id), options).then(function (results) {
          return results[1];
        }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
      }

      // By default we will just query for the one id. For multi patch
      // we create a list of the ids of all items that will be changed
      // to re-query them after the update
      var ids = id === null ? this._find(params).then(mapIds) : Promise.resolve([id]);

      return ids.then(function (idList) {
        // Create a new query that re-queries all ids that
        // were originally changed
        var findParams = _extends({}, params, {
          query: _defineProperty({}, _this.id, { $in: idList })
        });

        return _this.Model.update((0, _lodash2.default)(data, _this.id), options).then(function () {
          return _this._getOrFind(id, findParams);
        });
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'update',
    value: function update(id, data, params) {
      var options = _extends({}, params.sequelize);

      if (Array.isArray(data)) {
        return Promise.reject(new _feathersErrors2.default.BadRequest('Not replacing multiple records. Did you mean `patch`?'));
      }

      // Force the {raw: false} option as the instance is needed to properly
      // update
      return this.Model.findById(id, { raw: false }).then(function (instance) {
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
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }, {
    key: 'remove',
    value: function remove(id, params) {
      var _this2 = this;

      return this._getOrFind(id, params).then(function (data) {
        var where = _extends({}, (0, _feathersQueryFilters2.default)(params.query || {}).query);

        if (id !== null) {
          where[_this2.id] = id;
        }

        var options = _extends({}, params.sequelize, { where: where });

        return _this2.Model.destroy(options).then(function () {
          return data;
        });
      }).then((0, _feathersCommons.select)(params, this.id)).catch(utils.errorHandler);
    }
  }]);

  return Service;
}();

function init(options) {
  return new Service(options);
}

init.Service = Service;
module.exports = exports['default'];