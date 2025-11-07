import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, User, Clock, Lock } from "lucide-react";
import { format } from "date-fns";
import { useUserRole } from "@/hooks/useUserRole";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_by: string | null;
  old_data: any;
  new_data: any;
  changed_fields: string[];
  account_id: string | null;
  created_at: string;
  performer_name?: string;
  performer_email?: string;
}

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const { role } = useUserRole();

  // Check if user is super admin
  if (role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                Only Super Admins can view audit logs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchAuditLogs();

    // Subscribe to real-time audit log updates
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch performer details
      const performerIds = [...new Set(logsData?.map(log => log.performed_by).filter(Boolean))];
      
      if (performerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', performerIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.id, { name: p.full_name, email: p.email }])
        );

        const enrichedLogs = logsData?.map(log => ({
          ...log,
          performer_name: log.performed_by ? profilesMap.get(log.performed_by)?.name : null,
          performer_email: log.performed_by ? profilesMap.get(log.performed_by)?.email : null,
        }));

        setLogs(enrichedLogs || []);
      } else {
        setLogs(logsData || []);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "default"}>{action}</Badge>;
  };

  const getChangedFieldsSummary = (log: AuditLog) => {
    if (!log.changed_fields || log.changed_fields.length === 0) return "N/A";
    return log.changed_fields.join(", ");
  };

  const filteredLogs = logs.filter(log => {
    if (filterTable !== "all" && log.table_name !== filterTable) return false;
    if (filterAction !== "all" && log.action !== filterAction) return false;
    return true;
  });

  if (loading) {
    return <div className="p-6">Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Audit Logs</CardTitle>
          </div>
          <div className="flex gap-2">
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="profiles">Profiles</SelectItem>
                <SelectItem value="user_roles">User Roles</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Insert</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Changed Fields</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.table_name}
                      </code>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          {log.performer_name && (
                            <span className="text-sm font-medium">{log.performer_name}</span>
                          )}
                          {log.performer_email && (
                            <span className="text-xs text-muted-foreground">
                              {log.performer_email}
                            </span>
                          )}
                          {!log.performer_name && !log.performer_email && (
                            <span className="text-xs text-muted-foreground">System</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getChangedFieldsSummary(log)}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};