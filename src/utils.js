import errors from 'feathers-errors';

export function errorHandler(error) {
  let feathersError = error;

  if (error.name) {
    switch(error.name) {
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeExclusionConstraintError':
      case 'SequelizeForeignKeyConstraintError':
      case 'SequelizeInvalidConnectionError':
        feathersError = new errors.BadRequest(error);
        break;
      case 'SequelizeTimeoutError':
      case 'SequelizeConnectionTimedOutError':
        feathersError = new errors.Timeout(error);
        break;
      case 'SequelizeConnectionRefusedError':
      case 'SequelizeAccessDeniedError':
        feathersError = new errors.Forbidden(error);
        break;
      case 'SequelizeHostNotReachableError':
        feathersError = new errors.Unavailable(error);
        break;
      case 'SequelizeHostNotFoundError':
        feathersError = new errors.NotFound(error);
        break;
    }
  }

  throw feathersError;
}

export function getOrder(sort={}) {
  let order = [];

  Object.keys(sort).forEach(name => {
    let direction;
    switch (parseInt(sort[name], 10)) {
      case -2:
        direction = 'DESC NULLS LAST';
        break;
      case -1:
        direction = 'DESC';
        break;
      case 2:
        direction = 'ASC NULLS FRIST';
        break;
      default:
        direction = 'ASC';
        break;
    }
    order.push([ name, direction ]);
  });

  return order;
}

export function getWhere(query) {
  let where = Object.assign({}, query);

  Object.keys(where).forEach(prop => {
    let value = where[prop];
    if(value && value.$nin) {
      value = Object.assign({}, value);

      value.$notIn = value.$nin;
      delete value.$nin;

      where[prop] = value;
    }
  });

  return where;
}
