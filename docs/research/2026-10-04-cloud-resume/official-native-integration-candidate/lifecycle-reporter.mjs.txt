import { writeFileSync } from 'node:fs';
export default class OfficialLifecycleReporter {
  onTestRunEnd(modules, unhandledErrors, reason) {
    const moduleResults = modules.map(module => ({ file: module.moduleId, project: module.project.name,
      state: module.state(), errors: module.errors(), diagnostic: module.diagnostic(),
      suites: [...module.children.allSuites()].map(suite => ({ fullName: suite.fullName,
        state: suite.state(), errors: suite.errors(), options: suite.options })) }));
    const inventory = modules.flatMap(module => [...module.children.allTests()].map(test => ({
      file: module.moduleId, project: module.project.name, fullName: test.fullName,
      result: test.result(), options: test.options, diagnostic: test.diagnostic(),
    })));
    writeFileSync(process.env.NATIVE_FLIGHT_LIFECYCLE,
      JSON.stringify({ reason, unhandledErrors, modules: moduleResults, inventory }) + '\n', { flag: 'wx' });
  }
}
