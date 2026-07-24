import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Award, BookOpen, Building2, LayoutGrid, PanelLeft, Users } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage().props as { auth?: { user?: { role?: string } } };
    const role = auth?.user?.role;
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            url: '/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'Katalog',
            url: '/courses',
            icon: BookOpen,
        },
        ...(role === 'admin'
            ? [
                  {
                      title: 'Course Builder',
                      url: '/admin/course-builder',
                      icon: PanelLeft,
                  },
                  {
                      title: 'Sekolah',
                      url: '/admin/schools',
                      icon: Building2,
                  },
                  {
                      title: 'User',
                      url: '/admin/users',
                      icon: Users,
                  },
              ]
            : role === 'internal_instructor'
              ? [
                    {
                        title: 'Course Builder',
                        url: '/instructor/course-builder',
                        icon: PanelLeft,
                    },
                ]
              : []),
        {
            title: 'Sertifikat',
            url: '/certificates',
            icon: Award,
        },
    ];
    const footerNavItems: NavItem[] = [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
