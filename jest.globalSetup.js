module.exports = () => {
  process.env.RUNNING_TESTS = 'true';
  process.env.ENABLE_GRAPH_OBJECT_SCHEMA_VALIDATION = '1';
  process.env.JUPITERONE_RUNTIME_ENVIRONMENT = 'LOCAL';
};
