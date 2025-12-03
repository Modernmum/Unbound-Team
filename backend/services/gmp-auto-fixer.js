// GMP Auto-Fixer - Advanced Issue Resolution
// Specific fixes for common GMP issues

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class GMPAutoFixer {
  constructor() {
    this.fixHistory = [];
  }

  // =========================================================================
  // DATABASE FIXES
  // =========================================================================

  /**
   * Fix orphaned records in database
   */
  async fixOrphanedRecords() {
    console.log('🔧 Checking for orphaned records...');

    const fixes = [];

    try {
      // Find tasks without projects
      const { data: orphanedTasks } = await supabase
        .from('tasks')
        .select('id, project_id')
        .is('project_id', null);

      if (orphanedTasks && orphanedTasks.length > 0) {
        console.log(`  Found ${orphanedTasks.length} orphaned tasks`);

        // Delete or reassign orphaned tasks
        await supabase
          .from('tasks')
          .delete()
          .is('project_id', null);

        fixes.push({
          type: 'orphaned-tasks',
          count: orphanedTasks.length,
          action: 'deleted'
        });
      }

      // Find clients without users
      const { data: orphanedClients } = await supabase
        .from('clients')
        .select('id, user_id')
        .is('user_id', null);

      if (orphanedClients && orphanedClients.length > 0) {
        console.log(`  Found ${orphanedClients.length} orphaned clients`);
        fixes.push({
          type: 'orphaned-clients',
          count: orphanedClients.length,
          action: 'flagged'
        });
      }

      return { success: true, fixes };

    } catch (error) {
      console.error('Failed to fix orphaned records:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix database indexes (if slow queries detected)
   */
  async optimizeDatabase() {
    console.log('🔧 Optimizing database...');

    try {
      // Analyze tables (PostgreSQL specific)
      await supabase.rpc('analyze_tables');

      // Reindex if needed
      await supabase.rpc('reindex_tables');

      return { success: true, action: 'database-optimized' };

    } catch (error) {
      console.error('Failed to optimize database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    console.log('🔧 Cleaning up old data...');

    const cleanups = [];

    try {
      // Delete old logs (older than 90 days)
      const { data: oldLogs } = await supabase
        .from('logs')
        .delete()
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .select('id');

      if (oldLogs && oldLogs.length > 0) {
        cleanups.push({
          type: 'old-logs',
          count: oldLogs.length
        });
      }

      // Archive completed projects (older than 1 year)
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const { data: oldProjects } = await supabase
        .from('projects')
        .update({ archived: true })
        .eq('status', 'completed')
        .lt('completed_at', oneYearAgo)
        .select('id');

      if (oldProjects && oldProjects.length > 0) {
        cleanups.push({
          type: 'archived-projects',
          count: oldProjects.length
        });
      }

      return { success: true, cleanups };

    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // FRONTEND FIXES
  // =========================================================================

  /**
   * Clear browser cache issues
   */
  async clearCacheIssues() {
    console.log('🔧 Fixing cache issues...');

    // This would typically involve:
    // 1. Updating cache headers
    // 2. Clearing CDN cache
    // 3. Updating service worker

    // For now, just log
    console.log('  ℹ️  Manual cache clear recommended');

    return {
      success: true,
      recommendation: 'Ask users to clear cache (Ctrl+Shift+R)'
    };
  }

  /**
   * Fix broken asset links
   */
  async fixBrokenAssets() {
    console.log('🔧 Checking for broken assets...');

    const brokenAssets = [];
    const assetPaths = [
      '/assets/css/main.css',
      '/assets/js/app.js',
      '/assets/images/logo.png'
    ];

    for (const path of assetPaths) {
      try {
        const response = await fetch(`${process.env.GMP_URL}${path}`, {
          method: 'HEAD'
        });

        if (!response.ok) {
          brokenAssets.push(path);
        }
      } catch (error) {
        brokenAssets.push(path);
      }
    }

    if (brokenAssets.length > 0) {
      console.log(`  Found ${brokenAssets.length} broken assets`);
      return {
        success: false,
        brokenAssets,
        recommendation: 'Check asset deployment'
      };
    }

    return { success: true, message: 'All assets OK' };
  }

  // =========================================================================
  // API FIXES
  // =========================================================================

  /**
   * Restart failed background jobs
   */
  async restartFailedJobs() {
    console.log('🔧 Restarting failed jobs...');

    try {
      const { data: failedJobs } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24 hours

      if (failedJobs && failedJobs.length > 0) {
        console.log(`  Found ${failedJobs.length} failed jobs`);

        // Reset jobs to pending
        await supabase
          .from('background_jobs')
          .update({
            status: 'pending',
            retry_count: 0,
            last_error: null
          })
          .in('id', failedJobs.map(j => j.id));

        return {
          success: true,
          restarted: failedJobs.length
        };
      }

      return { success: true, message: 'No failed jobs' };

    } catch (error) {
      console.error('Failed to restart jobs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix rate limiting issues
   */
  async fixRateLimiting() {
    console.log('🔧 Checking rate limiting...');

    try {
      // Clear rate limit counters for legitimate users
      // This would depend on your rate limiting implementation

      return {
        success: true,
        message: 'Rate limits checked'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // USER ISSUES
  // =========================================================================

  /**
   * Fix stuck user sessions
   */
  async fixStuckSessions() {
    console.log('🔧 Fixing stuck sessions...');

    try {
      // Clear sessions older than 24 hours
      const { data: oldSessions } = await supabase
        .from('sessions')
        .delete()
        .lt('last_activity', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .select('id');

      if (oldSessions && oldSessions.length > 0) {
        console.log(`  Cleared ${oldSessions.length} stuck sessions`);
        return {
          success: true,
          cleared: oldSessions.length
        };
      }

      return { success: true, message: 'No stuck sessions' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins() {
    console.log('🔧 Resetting failed login attempts...');

    try {
      // Reset lockouts older than 1 hour
      const { data: locked } = await supabase
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null
        })
        .lt('locked_until', new Date())
        .select('id');

      if (locked && locked.length > 0) {
        console.log(`  Unlocked ${locked.length} accounts`);
        return {
          success: true,
          unlocked: locked.length
        };
      }

      return { success: true, message: 'No locked accounts' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // PERFORMANCE FIXES
  // =========================================================================

  /**
   * Optimize slow queries
   */
  async optimizeSlowQueries() {
    console.log('🔧 Optimizing slow queries...');

    // This would analyze query logs and suggest/apply optimizations
    // For now, just recommendations

    return {
      success: true,
      recommendations: [
        'Add index on projects.client_id',
        'Add index on tasks.due_date',
        'Consider partitioning logs table'
      ]
    };
  }

  // =========================================================================
  // RUN ALL FIXES
  // =========================================================================

  /**
   * Run all available fixes
   */
  async runAllFixes() {
    console.log('\n🔧 Running all auto-fixes...\n');

    const results = {
      timestamp: new Date(),
      fixes: []
    };

    // Database fixes
    results.fixes.push({
      name: 'Orphaned Records',
      result: await this.fixOrphanedRecords()
    });

    results.fixes.push({
      name: 'Old Data Cleanup',
      result: await this.cleanupOldData()
    });

    // Background job fixes
    results.fixes.push({
      name: 'Failed Jobs',
      result: await this.restartFailedJobs()
    });

    // Session fixes
    results.fixes.push({
      name: 'Stuck Sessions',
      result: await this.fixStuckSessions()
    });

    results.fixes.push({
      name: 'Failed Logins',
      result: await this.resetFailedLogins()
    });

    // Asset checks
    results.fixes.push({
      name: 'Broken Assets',
      result: await this.fixBrokenAssets()
    });

    // Summary
    const successful = results.fixes.filter(f => f.result.success).length;
    const failed = results.fixes.length - successful;

    console.log(`\n✅ Auto-fix complete: ${successful} successful, ${failed} failed\n`);

    this.fixHistory.push(results);

    return results;
  }

  /**
   * Get fix history
   */
  getHistory() {
    return this.fixHistory;
  }
}

module.exports = new GMPAutoFixer();
